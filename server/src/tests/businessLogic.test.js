const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const ProductionBatch = require('../models/ProductionBatch');
const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const InventoryTransaction = require('../models/InventoryTransaction');

let ownerToken;
let managerToken;
let salesToken;
let workerToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tea_business_db');
  }

  // Ensure test demo users exist
  const User = require('../models/User');
  const ensureUser = async (name, email, role) => {
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, password: 'password123', role });
    }
    return user;
  };

  await ensureUser('Radhe Shyam Gupta', 'owner@chaibusiness.com', 'owner');
  await ensureUser('Amitabh Sharma', 'manager@chaibusiness.com', 'manager');
  await ensureUser('Rohan Mehra', 'sales1@chaibusiness.com', 'sales');
  await ensureUser('Ramesh Kumar', 'worker@chaibusiness.com', 'worker');

  // Obtain auth tokens
  const ownerRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'owner@chaibusiness.com', password: 'password123' });
  ownerToken = ownerRes.body.data.token;

  const managerRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'manager@chaibusiness.com', password: 'password123' });
  managerToken = managerRes.body.data.token;

  const salesRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'sales1@chaibusiness.com', password: 'password123' });
  salesToken = salesRes.body.data.token;

  const workerRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'worker@chaibusiness.com', password: 'password123' });
  workerToken = workerRes.body.data.token;
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('1. Authentication & Role-Based Access Control', () => {
  test('Owner can access audit logs', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Manager cannot access audit logs (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('Worker cannot access financial dashboard overview (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('Sales staff cannot delete expenses (403 Forbidden)', async () => {
    const res = await request(app)
      .delete('/api/expenses/dummyId123')
      .set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(403);
  });
});

describe('2. Inventory Management & Stock Adjustment', () => {
  let testProduct;

  beforeAll(async () => {
    testProduct = await Product.create({
      name: 'Test Special Assam CTC 250g',
      sku: `TEST-ASSAM-${Date.now()}`,
      category: 'finished_good',
      unit: 'packet',
      costPrice: 50,
      sellingPrice: 100,
      minStockLevel: 20,
      currentStock: 100,
    });
  });

  test('Adjust stock positively (+50 packets) and records inventory transaction', async () => {
    const res = await request(app)
      .post(`/api/products/${testProduct._id}/adjust`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ quantityChange: 50, notes: 'Found extra in warehouse' });

    expect(res.status).toBe(200);
    expect(res.body.data.product.currentStock).toBe(150);

    const tx = await InventoryTransaction.findOne({ product: testProduct._id }).sort('-createdAt');
    expect(tx).toBeTruthy();
    expect(tx.quantity).toBe(50);
    expect(tx.newStock).toBe(150);
  });

  test('Adjust stock prevents negative stock (< 0)', async () => {
    const res = await request(app)
      .post(`/api/products/${testProduct._id}/adjust`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ quantityChange: -300, notes: 'Attempt over-deduction' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('3. Production Batching (Consumption & Finished Stock Increase)', () => {
  test('Completing a production batch consumes raw materials and increments finished good stock', async () => {
    // 1. Create dedicated raw material and finished product
    const rawLeaf = await Product.create({
      name: 'Test Raw Bulk Leaf',
      sku: `TEST-RM-LEAF-${Date.now()}`,
      category: 'raw_material',
      unit: 'kg',
      costPrice: 200,
      minStockLevel: 10,
      currentStock: 100,
    });

    const teaPack = await Product.create({
      name: 'Test Finished Tea 500g',
      sku: `TEST-FG-TEA-${Date.now()}`,
      category: 'finished_good',
      unit: 'packet',
      costPrice: 120,
      sellingPrice: 200,
      minStockLevel: 10,
      currentStock: 10,
    });

    // 2. Create and complete batch: produce 40 packets, consuming 20 kg raw leaf
    const batchRes = await request(app)
      .post('/api/production')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        product: teaPack._id,
        plannedQuantity: 40,
        producedQuantity: 40,
        rawMaterialsConsumed: [{ product: rawLeaf._id, quantity: 20, unit: 'kg' }],
        status: 'completed',
        notes: 'Test production batch run',
      });

    expect(batchRes.status).toBe(201);

    // 3. Verify stock changes
    const updatedRaw = await Product.findById(rawLeaf._id);
    expect(updatedRaw.currentStock).toBe(80); // 100 - 20 = 80

    const updatedFG = await Product.findById(teaPack._id);
    expect(updatedFG.currentStock).toBe(50); // 10 + 40 = 50
  });
});

describe('4. Sales Orders & Automatic Stock Deductions / Cancellation Restoration', () => {
  let customer;
  let product;

  beforeAll(async () => {
    customer = await Customer.create({
      name: 'Test Test Retailer',
      phone: `99999${Math.floor(10000 + Math.random() * 90000)}`,
      customerType: 'retailer',
      creditLimit: 50000,
      outstandingAmount: 0,
      totalPurchases: 0,
    });

    product = await Product.create({
      name: 'Order Test Tea 250g',
      sku: `ORD-TEST-${Date.now()}`,
      category: 'finished_good',
      unit: 'packet',
      costPrice: 60,
      sellingPrice: 120,
      minStockLevel: 10,
      currentStock: 100,
    });
  });

  test('Creating order in packed status deducts stock and increases customer dues', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer: customer._id,
        items: [{ product: product._id, quantity: 20, unitPrice: 120 }],
        orderStatus: 'packed',
      });

    expect(res.status).toBe(201);
    const order = res.body.data;
    expect(order.orderNumber).toMatch(/^SO-\d{4}-\d+/);
    expect(order.grandTotal).toBeGreaterThan(0);

    // Verify stock decreased
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.currentStock).toBe(80); // 100 - 20

    // Verify customer outstanding amount updated
    const updatedCustomer = await Customer.findById(customer._id);
    expect(updatedCustomer.outstandingAmount).toBe(order.grandTotal);

    // Now test cancelling this order restores stock and reverses dues
    const cancelRes = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'cancelled' });

    expect(cancelRes.status).toBe(200);

    const restoredProduct = await Product.findById(product._id);
    expect(restoredProduct.currentStock).toBe(100); // 80 + 20 restored!

    const restoredCustomer = await Customer.findById(customer._id);
    expect(restoredCustomer.outstandingAmount).toBe(0);
  });
});

describe('5. Payment Recording & Due Balance Settlement', () => {
  test('Recording customer payment reduces customer outstanding dues atomically', async () => {
    const cust = await Customer.create({
      name: 'Due Test Customer',
      phone: `98888${Math.floor(10000 + Math.random() * 90000)}`,
      creditLimit: 50000,
      totalPurchases: 25000,
      totalPaid: 0,
      outstandingAmount: 25000,
    });

    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        partyType: 'customer',
        partyId: cust._id,
        amount: 10000,
        paymentMethod: 'upi',
        referenceNumber: 'UPI-TEST-12345',
      });

    expect(payRes.status).toBe(201);
    expect(payRes.body.data.remainingDue).toBe(15000);

    const updatedCust = await Customer.findById(cust._id);
    expect(updatedCust.outstandingAmount).toBe(15000);
    expect(updatedCust.totalPaid).toBe(10000);
  });
});
