require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

// Models
const User = require('../models/User');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const WorkerSalaryPayment = require('../models/WorkerSalaryPayment');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const ProductionBatch = require('../models/ProductionBatch');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Order = require('../models/Order');
const Purchase = require('../models/Purchase');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Reminder = require('../models/Reminder');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

// Helper to generate dynamic dates relative to execution time
const daysAgo = (days, hours = 11, minutes = 30) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

const daysAhead = (days, hours = 18, minutes = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tea_business_db';
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Worker.deleteMany({}),
      Attendance.deleteMany({}),
      WorkerSalaryPayment.deleteMany({}),
      Product.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      ProductionBatch.deleteMany({}),
      Customer.deleteMany({}),
      Supplier.deleteMany({}),
      Order.deleteMany({}),
      Purchase.deleteMany({}),
      Payment.deleteMany({}),
      Expense.deleteMany({}),
      Reminder.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    console.log('🌱 Seeding Workers...');
    const workerDocs = await Worker.create([
      { name: 'Ramesh Kumar', phone: '9876500001', address: 'Old City, Kanpur', role: 'Machine Operator', department: 'Packaging', salary: 18000, employmentStatus: 'active' },
      { name: 'Suresh Patel', phone: '9876500002', address: 'Transport Nagar, Kanpur', role: 'Packaging Operator', department: 'Packaging', salary: 15000, employmentStatus: 'active' },
      { name: 'Dinesh Yadav', phone: '9876500003', address: 'Barra Sector 4, Kanpur', role: 'Tea Blending Master', department: 'Blending', salary: 22000, employmentStatus: 'active' },
      { name: 'Manoj Singh', phone: '9876500004', address: 'Govind Nagar, Kanpur', role: 'Blending Assistant', department: 'Blending', salary: 16000, employmentStatus: 'active' },
      { name: 'Rajesh Verma', phone: '9876500005', address: 'Civil Lines, Kanpur', role: 'Quality Checker', department: 'Quality Control', salary: 20000, employmentStatus: 'active' },
      { name: 'Anil Tiwari', phone: '9876500006', address: 'Kalyanpur, Kanpur', role: 'Warehouse Incharge', department: 'Warehouse', salary: 19000, employmentStatus: 'active' },
      { name: 'Sunil Gupta', phone: '9876500007', address: 'Rawatpur, Kanpur', role: 'Forklift & Loader', department: 'Warehouse', salary: 14000, employmentStatus: 'active' },
      { name: 'Vinod Sharma', phone: '9876500008', address: 'Kidwai Nagar, Kanpur', role: 'Sealing Operator', department: 'Packaging', salary: 15000, employmentStatus: 'active' },
      { name: 'Pankaj Mishra', phone: '9876500009', address: 'Panki, Kanpur', role: 'Carton Boxer', department: 'Packaging', salary: 14000, employmentStatus: 'active' },
      { name: 'Deepak Saxena', phone: '9876500010', address: 'Shyam Nagar, Kanpur', role: 'Maintenance Technician', department: 'Maintenance', salary: 21000, employmentStatus: 'active' },
      { name: 'Santosh Pal', phone: '9876500011', address: 'Jajmau, Kanpur', role: 'Helper & Cleaning', department: 'General', salary: 13000, employmentStatus: 'active' },
      { name: 'Vikas Kumar', phone: '9876500012', address: 'Fazalganj, Kanpur', role: 'Helper & Dispatch Loader', department: 'Warehouse', salary: 13500, employmentStatus: 'active' },
    ]);

    console.log('🌱 Seeding Users...');
    const owner = await User.create({
      name: 'Radhe Shyam Gupta',
      email: 'owner@chaibusiness.com',
      password: 'password123',
      role: 'owner',
      phone: '9876543210',
    });

    const manager = await User.create({
      name: 'Amitabh Sharma',
      email: 'manager@chaibusiness.com',
      password: 'password123',
      role: 'manager',
      phone: '9876543211',
    });

    const sales1 = await User.create({
      name: 'Rohan Mehra',
      email: 'sales1@chaibusiness.com',
      password: 'password123',
      role: 'sales',
      phone: '9876543212',
    });

    const sales2 = await User.create({
      name: 'Vikas Khurana',
      email: 'sales2@chaibusiness.com',
      password: 'password123',
      role: 'sales',
      phone: '9876543213',
    });

    const workerUser = await User.create({
      name: 'Ramesh Kumar',
      email: 'worker@chaibusiness.com',
      password: 'password123',
      role: 'worker',
      phone: '9876500001',
      workerRef: workerDocs[0]._id,
    });
    workerDocs[0].userAccount = workerUser._id;
    await workerDocs[0].save();

    console.log('🌱 Seeding Suppliers...');
    const suppliers = await Supplier.create([
      {
        name: 'Assam Valley Tea Gardens Ltd',
        contactPerson: 'Biren Gogoi',
        phone: '9435012345',
        email: 'sales@assamvalleytea.com',
        address: 'Dibrugarh, Assam',
        gstNumber: '18AAACA1234F1Z1',
        paymentTermsDays: 30,
        totalPurchased: 450000,
        totalPaid: 350000,
        outstandingPayable: 100000,
      },
      {
        name: 'Darjeeling Planters Consortium',
        contactPerson: 'Karma Bhutia',
        phone: '9832012345',
        email: 'orders@darjeelingplanters.in',
        address: 'Kurseong, Darjeeling, West Bengal',
        gstNumber: '19AAACD5678G1Z2',
        paymentTermsDays: 21,
        totalPurchased: 280000,
        totalPaid: 240000,
        outstandingPayable: 40000,
      },
      {
        name: 'PackWell Flexible Laminates Pvt Ltd',
        contactPerson: 'Arun Agarwal',
        phone: '9810056789',
        email: 'info@packwellpoly.com',
        address: 'Bawana Industrial Area, Delhi',
        gstNumber: '07AAACP9988H1Z5',
        paymentTermsDays: 30,
        totalPurchased: 125000,
        totalPaid: 125000,
        outstandingPayable: 0,
      },
      {
        name: 'Royal Spice & Botanical Hub',
        contactPerson: 'K. S. Narayanan',
        phone: '9447012399',
        email: 'spices@royalbotanical.in',
        address: 'Kumily, Thekkady, Kerala',
        gstNumber: '32AAACR4321J1Z8',
        paymentTermsDays: 15,
        totalPurchased: 90000,
        totalPaid: 75000,
        outstandingPayable: 15000,
      },
    ]);

    console.log('🌱 Seeding Raw Materials & Finished Products...');
    // Raw materials
    const rawBulkAssam = await Product.create({
      name: 'Assam Raw Bulk CTC Leaf (Grade BOPL)',
      sku: 'RM-ASSAM-CTC-BOPL',
      category: 'raw_material',
      subcategory: 'bulk_tea_leaf',
      unit: 'kg',
      costPrice: 220,
      sellingPrice: 0,
      minStockLevel: 500,
      currentStock: 1850,
      supplier: suppliers[0]._id,
      description: 'Prime harvest Assam CTC leaf in 50kg gunny bags for master blending',
    });

    const rawDarjeeling = await Product.create({
      name: 'Darjeeling Orthodox Whole Leaf (First Flush)',
      sku: 'RM-DARJ-ORTH-FF',
      category: 'raw_material',
      subcategory: 'bulk_tea_leaf',
      unit: 'kg',
      costPrice: 650,
      sellingPrice: 0,
      minStockLevel: 100,
      currentStock: 320,
      supplier: suppliers[1]._id,
      description: 'Delicate muscatel flavor whole leaf tea in wooden chests',
    });

    const rawSpices = await Product.create({
      name: 'Chai Masala Spice Blend (Elaichi, Clove, Dalchini, Ginger)',
      sku: 'RM-SPICE-BLEND',
      category: 'raw_material',
      subcategory: 'flavoring_spices',
      unit: 'kg',
      costPrice: 580,
      sellingPrice: 0,
      minStockLevel: 50,
      currentStock: 140,
      supplier: suppliers[3]._id,
      description: 'Micro-ground authentic aromatic spice blend for masala chai',
    });

    const rawPouches250 = await Product.create({
      name: 'Metallic Standup Zipper Pouch 250g',
      sku: 'RM-POUCH-250G',
      category: 'raw_material',
      subcategory: 'packaging_pouch',
      unit: 'piece',
      costPrice: 3.8,
      sellingPrice: 0,
      minStockLevel: 2000,
      currentStock: 8500,
      supplier: suppliers[2]._id,
      description: '3-ply foil barrier printed pouch with degassing zipper',
    });

    const rawPouches500 = await Product.create({
      name: 'Metallic Standup Zipper Pouch 500g',
      sku: 'RM-POUCH-500G',
      category: 'raw_material',
      subcategory: 'packaging_pouch',
      unit: 'piece',
      costPrice: 5.2,
      sellingPrice: 0,
      minStockLevel: 1500,
      currentStock: 4200,
      supplier: suppliers[2]._id,
      description: '3-ply foil barrier printed pouch for 500g packs',
    });

    const rawCartons = await Product.create({
      name: 'Master Corrugated Carton (Holds 40x250g)',
      sku: 'RM-CARTON-40X',
      category: 'raw_material',
      subcategory: 'box_carton',
      unit: 'box',
      costPrice: 28,
      sellingPrice: 0,
      minStockLevel: 100,
      currentStock: 45, // Low stock for alert testing!
      supplier: suppliers[2]._id,
      description: '5-ply heavy duty outer shipping carton',
    });

    // Finished goods
    const fgAssam250 = await Product.create({
      name: 'ChaiCraft Gold CTC Tea 250g',
      sku: 'CC-GOLD-250G',
      category: 'finished_good',
      subcategory: 'black_tea',
      unit: 'packet',
      costPrice: 65,
      sellingPrice: 110,
      minStockLevel: 300,
      currentStock: 1240,
      batchNumber: 'TB-2026-001',
      expiryDate: daysAhead(320),
      description: 'Strong brisk kadak chai blend in airtight 250g pouch',
    });

    const fgAssam500 = await Product.create({
      name: 'ChaiCraft Gold CTC Tea 500g',
      sku: 'CC-GOLD-500G',
      category: 'finished_good',
      subcategory: 'black_tea',
      unit: 'packet',
      costPrice: 125,
      sellingPrice: 210,
      minStockLevel: 200,
      currentStock: 680,
      batchNumber: 'TB-2026-002',
      expiryDate: daysAhead(320),
      description: 'Family size 500g pack of strong Assam CTC tea',
    });

    const fgMasala250 = await Product.create({
      name: 'ChaiCraft Royal Masala Chai 250g',
      sku: 'CC-MASALA-250G',
      category: 'finished_good',
      subcategory: 'spiced_tea',
      unit: 'packet',
      costPrice: 85,
      sellingPrice: 145,
      minStockLevel: 250,
      currentStock: 190, // Low stock alert!
      batchNumber: 'TB-2026-003',
      expiryDate: daysAhead(25), // Nearing expiry within 30 days
      description: 'CTC tea infused with cardamom, cinnamon, cloves and ginger',
    });

    const fgDarjeeling100 = await Product.create({
      name: 'ChaiCraft Heritage Darjeeling 100g',
      sku: 'CC-DARJ-100G',
      category: 'finished_good',
      subcategory: 'orthodox',
      unit: 'packet',
      costPrice: 90,
      sellingPrice: 180,
      minStockLevel: 100,
      currentStock: 420,
      batchNumber: 'TB-2026-004',
      expiryDate: daysAhead(280),
      description: 'Exclusive 100g tin-pack Darjeeling whole leaf tea',
    });

    const fgGreen100 = await Product.create({
      name: 'ChaiCraft Pure Green Tea 100g',
      sku: 'CC-GREEN-100G',
      category: 'finished_good',
      subcategory: 'green_tea',
      unit: 'packet',
      costPrice: 55,
      sellingPrice: 120,
      minStockLevel: 80,
      currentStock: 310,
      batchNumber: 'TB-2026-005',
      expiryDate: daysAhead(200),
      description: 'Antioxidant-rich whole green tea leaf',
    });

    console.log('🌱 Seeding Customers & Dealers...');
    const customers = await Customer.create([
      {
        name: 'Sharma Traders & Supermarket',
        contactPerson: 'Mukesh Sharma',
        phone: '9839011111',
        email: 'sharmatraders.kanpur@gmail.com',
        address: 'Nayaganj Wholesale Market, Kanpur',
        area: 'Kanpur Central',
        customerType: 'wholesaler',
        creditLimit: 150000,
        paymentTermsDays: 15,
        gstNumber: '09AAACS1122K1Z4',
        assignedSalesperson: sales1._id,
        totalPurchases: 328100,
        totalPaid: 286100,
        outstandingAmount: 42000,
      },
      {
        name: 'Gupta Tea Depot & Provisions',
        contactPerson: 'Sanjay Gupta',
        phone: '9839022222',
        email: 'guptateadepot@gmail.com',
        address: 'Chowk Mandi, Lucknow',
        area: 'Lucknow Central',
        customerType: 'distributor',
        creditLimit: 200000,
        paymentTermsDays: 20,
        gstNumber: '09AAACG3344M1Z8',
        assignedSalesperson: sales1._id,
        totalPurchases: 465913,
        totalPaid: 430913,
        outstandingAmount: 35000,
      },
      {
        name: 'Verma Brothers Daily Mart',
        contactPerson: 'Anand Verma',
        phone: '9839033333',
        email: 'vermabros.vns@yahoo.com',
        address: 'Godowlia Crossing, Varanasi',
        area: 'Varanasi',
        customerType: 'wholesaler',
        creditLimit: 100000,
        paymentTermsDays: 15,
        gstNumber: '09AAACV5566N1Z2',
        assignedSalesperson: sales2._id,
        totalPurchases: 207500,
        totalPaid: 187500,
        outstandingAmount: 20000,
      },
      {
        name: 'Rajputana Departmental Store',
        contactPerson: 'Bhawani Singh',
        phone: '9414044444',
        email: 'rajputana.retail@gmail.com',
        address: 'Johari Bazar, Jaipur',
        area: 'Jaipur',
        customerType: 'retailer',
        creditLimit: 50000,
        paymentTermsDays: 10,
        gstNumber: '08AAACR7788P1Z6',
        assignedSalesperson: sales2._id,
        totalPurchases: 115000,
        totalPaid: 115000,
        outstandingAmount: 0,
      },
      {
        name: 'Kashi Chai Kendra & Sons',
        contactPerson: 'Pramod Jaiswal',
        phone: '9839055555',
        email: 'kashichai@gmail.com',
        address: 'Assi Ghat Road, Varanasi',
        area: 'Varanasi South',
        customerType: 'distributor',
        creditLimit: 120000,
        paymentTermsDays: 15,
        gstNumber: '09AAACJ9900Q1Z0',
        assignedSalesperson: sales2._id,
        totalPurchases: 232000,
        totalPaid: 204000,
        outstandingAmount: 28000,
      },
      {
        name: 'Apna Super Bazar Direct',
        contactPerson: 'Ritu Srivastava',
        phone: '9839066666',
        email: 'apnabazar.knp@gmail.com',
        address: 'Kakadeo, Kanpur',
        area: 'Kanpur West',
        customerType: 'retailer',
        creditLimit: 30000,
        paymentTermsDays: 7,
        gstNumber: '09AAACA1100R1Z9',
        assignedSalesperson: sales1._id,
        totalPurchases: 62000,
        totalPaid: 62000,
        outstandingAmount: 0,
      },
    ]);

    console.log('🌱 Seeding Orders & Invoices across recent timeline...');
    // Order 1: 6 days ago (Sharma Traders)
    const order1 = await Order.create({
      orderNumber: 'SO-2026-0001',
      customer: customers[0]._id,
      items: [
        { product: fgAssam250._id, name: fgAssam250.name, sku: fgAssam250.sku, quantity: 200, unitPrice: 110, total: 22000 },
        { product: fgAssam500._id, name: fgAssam500.name, sku: fgAssam500.sku, quantity: 100, unitPrice: 210, total: 21000 },
      ],
      subtotal: 43000,
      discount: 1000,
      taxRate: 5,
      taxAmount: 2100,
      grandTotal: 44100,
      paidAmount: 20000,
      dueAmount: 24100,
      paymentStatus: 'partial',
      orderStatus: 'delivered',
      orderDate: daysAgo(6, 10, 15),
      stockDeducted: true,
      deliveryAddress: customers[0].address,
      createdBy: sales1._id,
    });

    // Order 2: 5 days ago (Gupta Tea Depot)
    const order2 = await Order.create({
      orderNumber: 'SO-2026-0002',
      customer: customers[1]._id,
      items: [
        { product: fgAssam250._id, name: fgAssam250.name, sku: fgAssam250.sku, quantity: 300, unitPrice: 110, total: 33000 },
        { product: fgMasala250._id, name: fgMasala250.name, sku: fgMasala250.sku, quantity: 150, unitPrice: 145, total: 21750 },
      ],
      subtotal: 54750,
      discount: 1500,
      taxRate: 5,
      taxAmount: 2662.5,
      grandTotal: 55913,
      paidAmount: 55913,
      dueAmount: 0,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      orderDate: daysAgo(5, 14, 20),
      stockDeducted: true,
      deliveryAddress: customers[1].address,
      createdBy: sales1._id,
    });

    // Order 3: 4 days ago (Verma Brothers)
    const order3 = await Order.create({
      orderNumber: 'SO-2026-0003',
      customer: customers[2]._id,
      items: [
        { product: fgDarjeeling100._id, name: fgDarjeeling100.name, sku: fgDarjeeling100.sku, quantity: 80, unitPrice: 180, total: 14400 },
        { product: fgGreen100._id, name: fgGreen100.name, sku: fgGreen100.sku, quantity: 50, unitPrice: 120, total: 6000 },
      ],
      subtotal: 20400,
      discount: 400,
      taxRate: 5,
      taxAmount: 1000,
      grandTotal: 21000,
      paidAmount: 15000,
      dueAmount: 6000,
      paymentStatus: 'partial',
      orderStatus: 'delivered',
      orderDate: daysAgo(4, 11, 45),
      stockDeducted: true,
      deliveryAddress: customers[2].address,
      createdBy: sales2._id,
    });

    // Order 4: 3 days ago (Rajputana Store)
    const order4 = await Order.create({
      orderNumber: 'SO-2026-0004',
      customer: customers[3]._id,
      items: [
        { product: fgAssam250._id, name: fgAssam250.name, sku: fgAssam250.sku, quantity: 150, unitPrice: 110, total: 16500 },
        { product: fgMasala250._id, name: fgMasala250.name, sku: fgMasala250.sku, quantity: 100, unitPrice: 145, total: 14500 },
      ],
      subtotal: 31000,
      discount: 1000,
      taxRate: 5,
      taxAmount: 1500,
      grandTotal: 31500,
      paidAmount: 31500,
      dueAmount: 0,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      orderDate: daysAgo(3, 16, 10),
      stockDeducted: true,
      deliveryAddress: customers[3].address,
      createdBy: sales2._id,
    });

    // Order 5: 2 days ago (Kashi Chai Kendra)
    const order5 = await Order.create({
      orderNumber: 'SO-2026-0005',
      customer: customers[4]._id,
      items: [
        { product: fgAssam500._id, name: fgAssam500.name, sku: fgAssam500.sku, quantity: 120, unitPrice: 210, total: 25200 },
        { product: fgDarjeeling100._id, name: fgDarjeeling100.name, sku: fgDarjeeling100.sku, quantity: 60, unitPrice: 180, total: 10800 },
      ],
      subtotal: 36000,
      discount: 1000,
      taxRate: 5,
      taxAmount: 1750,
      grandTotal: 36750,
      paidAmount: 20000,
      dueAmount: 16750,
      paymentStatus: 'partial',
      orderStatus: 'delivered',
      orderDate: daysAgo(2, 13, 0),
      stockDeducted: true,
      deliveryAddress: customers[4].address,
      createdBy: sales2._id,
    });

    // Order 6: Yesterday (Apna Super Bazar)
    const order6 = await Order.create({
      orderNumber: 'SO-2026-0006',
      customer: customers[5]._id,
      items: [
        { product: fgAssam250._id, name: fgAssam250.name, sku: fgAssam250.sku, quantity: 80, unitPrice: 110, total: 8800 },
        { product: fgGreen100._id, name: fgGreen100.name, sku: fgGreen100.sku, quantity: 60, unitPrice: 120, total: 7200 },
      ],
      subtotal: 16000,
      discount: 500,
      taxRate: 5,
      taxAmount: 775,
      grandTotal: 16275,
      paidAmount: 16275,
      dueAmount: 0,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      orderDate: daysAgo(1, 15, 30),
      stockDeducted: true,
      deliveryAddress: customers[5].address,
      createdBy: sales1._id,
    });

    // Order 7: Today - Delivered (Sharma Traders repeat order)
    const order7 = await Order.create({
      orderNumber: 'SO-2026-0007',
      customer: customers[0]._id,
      items: [
        { product: fgMasala250._id, name: fgMasala250.name, sku: fgMasala250.sku, quantity: 180, unitPrice: 145, total: 26100 },
      ],
      subtotal: 26100,
      discount: 600,
      taxRate: 5,
      taxAmount: 1275,
      grandTotal: 26775,
      paidAmount: 20000,
      dueAmount: 6775,
      paymentStatus: 'partial',
      orderStatus: 'delivered',
      orderDate: daysAgo(0, 10, 30),
      stockDeducted: true,
      deliveryAddress: customers[0].address,
      createdBy: sales1._id,
    });

    // Order 8: Today - Processing / Pending Order (Gupta Tea Depot)
    const order8 = await Order.create({
      orderNumber: 'SO-2026-0008',
      customer: customers[1]._id,
      items: [
        { product: fgAssam250._id, name: fgAssam250.name, sku: fgAssam250.sku, quantity: 250, unitPrice: 110, total: 27500 },
        { product: fgAssam500._id, name: fgAssam500.name, sku: fgAssam500.sku, quantity: 80, unitPrice: 210, total: 16800 },
      ],
      subtotal: 44300,
      discount: 1300,
      taxRate: 5,
      taxAmount: 2150,
      grandTotal: 45150,
      paidAmount: 10000,
      dueAmount: 35150,
      paymentStatus: 'partial',
      orderStatus: 'processing',
      orderDate: daysAgo(0, 14, 15),
      stockDeducted: false,
      deliveryAddress: customers[1].address,
      createdBy: sales1._id,
    });

    console.log('🌱 Seeding Production Batches...');
    await ProductionBatch.create([
      {
        batchNumber: 'TB-2026-001',
        product: fgAssam250._id,
        plannedQuantity: 1500,
        producedQuantity: 1480,
        productionDate: daysAgo(7),
        expiryDate: daysAhead(350),
        workers: [workerDocs[0]._id, workerDocs[1]._id, workerDocs[2]._id],
        rawMaterialsConsumed: [
          { product: rawBulkAssam._id, quantity: 370, unit: 'kg' },
          { product: rawPouches250._id, quantity: 1480, unit: 'piece' },
        ],
        status: 'completed',
        completedAt: daysAgo(7, 18, 0),
        createdBy: manager._id,
      },
      {
        batchNumber: 'TB-2026-002',
        product: fgAssam500._id,
        plannedQuantity: 800,
        producedQuantity: 790,
        productionDate: daysAgo(3),
        expiryDate: daysAhead(350),
        workers: [workerDocs[0]._id, workerDocs[1]._id],
        rawMaterialsConsumed: [
          { product: rawBulkAssam._id, quantity: 395, unit: 'kg' },
          { product: rawPouches500._id, quantity: 790, unit: 'piece' },
        ],
        status: 'completed',
        completedAt: daysAgo(3, 17, 30),
        createdBy: manager._id,
      },
      {
        batchNumber: 'TB-2026-003',
        product: fgMasala250._id,
        plannedQuantity: 500,
        producedQuantity: 495,
        productionDate: daysAgo(0, 9, 0),
        expiryDate: daysAhead(180),
        workers: [workerDocs[2]._id, workerDocs[3]._id, workerDocs[4]._id],
        rawMaterialsConsumed: [
          { product: rawBulkAssam._id, quantity: 115, unit: 'kg' },
          { product: rawSpices._id, quantity: 10, unit: 'kg' },
          { product: rawPouches250._id, quantity: 500, unit: 'piece' },
        ],
        status: 'completed',
        completedAt: daysAgo(0, 15, 0),
        createdBy: manager._id,
      },
      {
        batchNumber: 'TB-2026-004',
        product: fgDarjeeling100._id,
        plannedQuantity: 400,
        producedQuantity: 0,
        productionDate: daysAgo(0, 11, 0),
        expiryDate: daysAhead(365),
        workers: [workerDocs[4]._id, workerDocs[5]._id],
        rawMaterialsConsumed: [
          { product: rawDarjeeling._id, quantity: 40, unit: 'kg' },
        ],
        status: 'in_progress',
        createdBy: manager._id,
      },
    ]);

    console.log('🌱 Seeding Purchases...');
    await Purchase.create([
      {
        purchaseNumber: 'PO-2026-0001',
        supplierInvoiceNo: 'AVT/2026/902',
        supplier: suppliers[0]._id,
        items: [
          { product: rawBulkAssam._id, name: rawBulkAssam.name, sku: rawBulkAssam.sku, quantity: 1000, unitCost: 220, total: 220000 },
        ],
        totalAmount: 220000,
        paidAmount: 120000,
        dueAmount: 100000,
        paymentStatus: 'partial',
        status: 'received',
        purchaseDate: daysAgo(12),
        receivedDate: daysAgo(9),
        stockAdded: true,
        createdBy: manager._id,
      },
      {
        purchaseNumber: 'PO-2026-0002',
        supplierInvoiceNo: 'DP/2026/410',
        supplier: suppliers[1]._id,
        items: [
          { product: rawDarjeeling._id, name: rawDarjeeling.name, sku: rawDarjeeling.sku, quantity: 200, unitCost: 650, total: 130000 },
        ],
        totalAmount: 130000,
        paidAmount: 90000,
        dueAmount: 40000,
        paymentStatus: 'partial',
        status: 'received',
        purchaseDate: daysAgo(8),
        receivedDate: daysAgo(5),
        stockAdded: true,
        createdBy: manager._id,
      },
      {
        purchaseNumber: 'PO-2026-0003',
        supplierInvoiceNo: 'PW/7821',
        supplier: suppliers[2]._id,
        items: [
          { product: rawPouches250._id, name: rawPouches250.name, sku: rawPouches250.sku, quantity: 10000, unitCost: 3.8, total: 38000 },
          { product: rawPouches500._id, name: rawPouches500.name, sku: rawPouches500.sku, quantity: 5000, unitCost: 5.2, total: 26000 },
        ],
        totalAmount: 64000,
        paidAmount: 64000,
        dueAmount: 0,
        paymentStatus: 'paid',
        status: 'received',
        purchaseDate: daysAgo(4),
        receivedDate: daysAgo(2),
        stockAdded: true,
        createdBy: manager._id,
      },
    ]);

    console.log('🌱 Seeding Payments...');
    await Payment.create([
      {
        receiptNumber: 'REC-2026-0001',
        partyType: 'customer',
        partyId: customers[0]._id,
        partyModel: 'Customer',
        order: order1._id,
        amount: 20000,
        paymentMethod: 'bank_transfer',
        referenceNumber: 'NEFT-HDFC-998231',
        paymentDate: daysAgo(5),
        previousDue: 44100,
        remainingDue: 24100,
        notes: 'Advance part payment for order SO-2026-0001',
        createdBy: sales1._id,
      },
      {
        receiptNumber: 'REC-2026-0002',
        partyType: 'customer',
        partyId: customers[1]._id,
        partyModel: 'Customer',
        order: order2._id,
        amount: 55913,
        paymentMethod: 'upi',
        referenceNumber: 'UPI/62901192837/SBI',
        paymentDate: daysAgo(4),
        previousDue: 55913,
        remainingDue: 0,
        notes: 'Full payment on delivery',
        createdBy: sales1._id,
      },
      {
        receiptNumber: 'REC-2026-0003',
        partyType: 'customer',
        partyId: customers[0]._id,
        partyModel: 'Customer',
        order: order7._id,
        amount: 20000,
        paymentMethod: 'upi',
        referenceNumber: 'UPI/77881928374/ICICI',
        paymentDate: daysAgo(0, 11, 45), // Today's collection!
        previousDue: 26775,
        remainingDue: 6775,
        notes: 'Instant UPI payment on dispatch',
        createdBy: sales1._id,
      },
      {
        receiptNumber: 'PAY-2026-0001',
        partyType: 'supplier',
        partyId: suppliers[0]._id,
        partyModel: 'Supplier',
        amount: 120000,
        paymentMethod: 'bank_transfer',
        referenceNumber: 'RTGS-PUNB-883921',
        paymentDate: daysAgo(8),
        previousDue: 220000,
        remainingDue: 100000,
        notes: 'Part payment for bulk Assam leaf dispatch',
        createdBy: owner._id,
      },
    ]);

    console.log('🌱 Seeding Expenses...');
    await Expense.create([
      { category: 'electricity', amount: 14500, date: daysAgo(10), description: 'Factory power bill - KESCO', paymentMethod: 'bank_transfer', vendor: 'Kanpur Electricity Supply Corp', createdBy: owner._id },
      { category: 'transport', amount: 8200, date: daysAgo(4), description: 'Freight dispatch tempo charges for Lucknow route', paymentMethod: 'cash', vendor: 'Shree Ram Transport', createdBy: manager._id },
      { category: 'fuel', amount: 3500, date: daysAgo(2), description: 'Diesel for backup factory generator (50 Litres)', paymentMethod: 'upi', vendor: 'Indian Oil Petrol Pump', createdBy: manager._id },
      { category: 'maintenance', amount: 4800, date: daysAgo(1), description: 'Belt and bearing replacement on rotary packing machine', paymentMethod: 'cash', vendor: 'Gupta Industrial Works', createdBy: manager._id },
      { category: 'marketing', amount: 1200, date: daysAgo(0, 11, 0), description: 'Special sample leaves & tasting supplies for dealer visit', paymentMethod: 'cash', vendor: 'Tea Board Quality Center', createdBy: manager._id },
      { category: 'packaging', amount: 2400, date: daysAgo(0, 14, 0), description: 'Heavy packaging tape and strapping rolls', paymentMethod: 'upi', vendor: 'Stationery & Packing Mart', createdBy: manager._id },
    ]);

    console.log('🌱 Seeding Daily Attendance...');
    const attendanceRecords = [];
    
    // Attendance for the past 3 days (including today)
    [2, 1, 0].forEach(d => {
      const date = daysAgo(d, 9, 0);
      workerDocs.forEach((w, index) => {
        let status = 'present';
        if (index === 10) status = 'half_day';
        if (index === 11) status = 'leave';

        attendanceRecords.push({
          worker: w._id,
          date,
          status,
          checkInTime: status === 'leave' ? '' : '09:00 AM',
          checkOutTime: status === 'leave' ? '' : status === 'half_day' ? '01:30 PM' : '06:00 PM',
          markedBy: manager._id,
        });
      });
    });
    await Attendance.insertMany(attendanceRecords);

    console.log('🌱 Seeding Worker Salary Payments...');
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    await WorkerSalaryPayment.create([
      {
        worker: workerDocs[0]._id,
        month: currentMonth,
        baseSalary: 18000,
        advance: 2000,
        deductions: 0,
        paidAmount: 16000,
        remainingDue: 0,
        paymentDate: daysAgo(5),
        paymentMethod: 'bank_transfer',
        referenceNo: 'SAL/NEFT/001',
        createdBy: manager._id,
      },
      {
        worker: workerDocs[1]._id,
        month: currentMonth,
        baseSalary: 15000,
        advance: 1000,
        deductions: 500,
        paidAmount: 13500,
        remainingDue: 0,
        paymentDate: daysAgo(5),
        paymentMethod: 'bank_transfer',
        referenceNo: 'SAL/NEFT/002',
        createdBy: manager._id,
      },
      {
        worker: workerDocs[2]._id,
        month: currentMonth,
        baseSalary: 22000,
        advance: 0,
        deductions: 0,
        paidAmount: 22000,
        remainingDue: 0,
        paymentDate: daysAgo(5),
        paymentMethod: 'bank_transfer',
        referenceNo: 'SAL/NEFT/003',
        createdBy: manager._id,
      },
    ]);

    console.log('🌱 Seeding Business Reminders...');
    await Reminder.create([
      {
        title: 'FSSAI Central Food Safety License Renewal',
        category: 'license',
        dueDate: daysAhead(15),
        reminderDaysBefore: 30,
        status: 'due_soon',
        notes: 'Mandatory 5-year FSSAI manufacturing license renewal inspection',
        createdBy: owner._id,
      },
      {
        title: 'GST Monthly GSTR-3B Return Filing',
        category: 'tax_filing',
        dueDate: daysAhead(4),
        reminderDaysBefore: 10,
        status: 'due_soon',
        notes: 'File monthly GSTR-3B with CA Satish Agarwal',
        createdBy: owner._id,
      },
      {
        title: 'Electronic Weighing Scale Calibration Certification',
        category: 'equipment_maintenance',
        dueDate: daysAhead(25),
        reminderDaysBefore: 20,
        status: 'upcoming',
        notes: 'Legal metrology annual stamped calibration for packing scales',
        createdBy: manager._id,
      },
      {
        title: 'Factory Fire Safety Audit Inspection',
        category: 'business_document',
        dueDate: daysAhead(40),
        reminderDaysBefore: 15,
        status: 'upcoming',
        notes: 'Refill CO2 extinguishers and update safety drill report',
        createdBy: manager._id,
      },
    ]);

    console.log('🌱 Seeding Notifications...');
    await Notification.create([
      {
        title: 'Low Stock Alert: Master Corrugated Carton',
        message: 'Current stock (45 box) is below minimum threshold (100 box).',
        type: 'low_stock',
        link: '/inventory',
      },
      {
        title: 'Low Stock Alert: ChaiCraft Royal Masala Chai 250g',
        message: 'Stock has fallen to 190 packets (Threshold: 250 packets).',
        type: 'low_stock',
        link: '/inventory',
      },
      {
        title: 'Payment Received: ₹20,000 from Sharma Traders',
        message: 'UPI payment received for Order SO-2026-0007.',
        type: 'order_status',
        link: '/payments',
      },
      {
        title: 'Batch TB-2026-003 Completed Today',
        message: 'Successfully packed 495 packets of Royal Masala Chai.',
        type: 'production_alert',
        link: '/production',
      },
    ]);

    console.log('🌱 Seeding Audit Logs...');
    await AuditLog.create([
      {
        action: 'SYSTEM_INITIALIZED',
        entity: 'System',
        performedBy: { userId: owner._id, name: owner.name, role: owner.role },
        details: 'Initial database seeding and parameters initialized',
      },
      {
        action: 'ORDER_CREATED',
        entity: 'Order',
        entityId: order7._id,
        performedBy: { userId: sales1._id, name: sales1.name, role: sales1.role },
        details: 'Generated order SO-2026-0007 for Sharma Traders',
      },
      {
        action: 'BATCH_COMPLETED',
        entity: 'ProductionBatch',
        performedBy: { userId: manager._id, name: manager.name, role: manager.role },
        details: 'Completed batch TB-2026-003 with 495 produced units',
      },
    ]);

    console.log('\n======================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Demo Login Credentials:');
    console.log('👑 Owner:   owner@chaibusiness.com    / password123');
    console.log('👔 Manager: manager@chaibusiness.com  / password123');
    console.log('💼 Sales 1: sales1@chaibusiness.com   / password123');
    console.log('💼 Sales 2: sales2@chaibusiness.com   / password123');
    console.log('👷 Worker:  worker@chaibusiness.com   / password123');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
