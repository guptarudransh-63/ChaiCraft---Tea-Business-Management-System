import React from 'react';
import { Printer, Download, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const InvoiceView = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action buttons (hidden when printing) */}
      <div className="flex items-center justify-end space-x-3 print:hidden">
        <button
          onClick={handlePrint}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium transition shadow-xs"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Invoice Container */}
      <div id="printable-invoice" className="bg-white border border-slate-200 rounded-xl p-8 sm:p-10 text-slate-800 shadow-xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black tracking-tight text-emerald-800 uppercase font-serif">
                CHAICRAFT
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                TEA BRAND & BLENDS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">ChaiCraft Agro Manufacturing & Packaging Pvt Ltd</p>
            <p className="text-xs text-slate-500">Plot 45, Fazalganj Industrial Area, Kanpur, UP - 208012</p>
            <p className="text-xs text-slate-500">GSTIN: <span className="font-mono font-medium">09AAACC8899K1Z7</span> | FSSAI: <span className="font-mono font-medium">10022051000192</span></p>
          </div>

          <div className="text-left sm:text-right">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-wider">TAX INVOICE</h2>
            <p className="text-sm font-bold text-emerald-700 font-mono mt-0.5">{order.orderNumber}</p>
            <p className="text-xs text-slate-500 mt-1">Date: <span className="font-medium text-slate-700">{formatDate(order.orderDate)}</span></p>
            <div className="mt-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : order.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billed To (Customer):</h4>
            <div className="mt-1.5">
              <p className="text-sm font-bold text-slate-900">{order.customer?.name || 'Customer'}</p>
              {order.customer?.contactPerson && (
                <p className="text-xs text-slate-600">Attn: {order.customer.contactPerson}</p>
              )}
              <p className="text-xs text-slate-600 mt-0.5">{order.deliveryAddress || order.customer?.address || '-'}</p>
              <p className="text-xs text-slate-600">Phone: {order.customer?.phone || '-'}</p>
              {order.customer?.gstNumber && (
                <p className="text-xs text-slate-600 font-mono mt-0.5">GSTIN: {order.customer.gstNumber}</p>
              )}
            </div>
          </div>

          <div className="sm:text-right">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dispatch Details:</h4>
            <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
              <p>Order Status: <span className="font-semibold text-slate-800 capitalize">{order.orderStatus}</span></p>
              <p>Payment Terms: <span className="font-medium text-slate-800">{order.customer?.paymentTermsDays || 15} Days</span></p>
              <p>Place of Supply: <span className="font-medium text-slate-800">Uttar Pradesh (09)</span></p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 w-10">#</th>
                <th className="py-2.5">Item Description</th>
                <th className="py-2.5 text-right w-20">SKU</th>
                <th className="py-2.5 text-right w-20">Qty</th>
                <th className="py-2.5 text-right w-24">Rate</th>
                <th className="py-2.5 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {order.items?.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50">
                  <td className="py-3 text-slate-400 font-mono">{index + 1}</td>
                  <td className="py-3">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <span className="text-[10px] text-slate-400 uppercase">HSN: 0902 (Tea)</span>
                  </td>
                  <td className="py-3 text-right font-mono text-slate-500">{item.sku}</td>
                  <td className="py-3 text-right font-bold text-slate-900">{item.quantity}</td>
                  <td className="py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary */}
        <div className="flex flex-col sm:flex-row justify-between pt-4 border-t border-slate-200 gap-6">
          <div className="max-w-xs space-y-2 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Bank Details for Direct RTGS/NEFT/UPI:</p>
            <p>Account Name: <span className="font-medium text-slate-800">ChaiCraft Agro Mfg Pvt Ltd</span></p>
            <p>Bank: <span className="font-medium text-slate-800">HDFC Bank, Mall Road Branch</span></p>
            <p className="font-mono">A/C: 50200088991122 | IFSC: HDFC0000123</p>
            <p className="italic text-[11px] pt-2 text-slate-400">Thank you for your business! Goods once sold are not returnable without prior inspection approval.</p>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Special Discount:</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>GST ({order.taxRate}%):</span>
              <span className="font-medium">{formatCurrency(order.taxAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-300 text-sm font-bold text-slate-900">
              <span>Total Amount:</span>
              <span className="text-emerald-800 font-black">{formatCurrency(order.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1 border-t border-dashed border-slate-200">
              <span>Amount Paid:</span>
              <span className="font-medium text-emerald-700">{formatCurrency(order.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-rose-700">
              <span>Outstanding Due:</span>
              <span>{formatCurrency(order.dueAmount)}</span>
            </div>
          </div>
        </div>

        {/* Signature Line */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div>
            <p>Customer Receiver Signature & Stamp</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-800 mb-8">For ChaiCraft Agro Mfg Pvt Ltd</p>
            <p className="border-t border-slate-300 pt-1">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};
