import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, X, ShieldCheck } from 'lucide-react'
import { Button } from '../ui/Button'
import { formatTWD } from '../../lib/format'
import type { EGuiInvoice } from '../../types'
import { useLang } from '../../i18n'

interface TaiwanInvoiceModalProps {
  invoice: EGuiInvoice
  onClose: () => void
}

export function TaiwanInvoiceModal({ invoice, onClose }: TaiwanInvoiceModalProps) {
  const { lang } = useLang()

  // Generate standard Taiwan MOF dual QR code strings
  const qrLeft = `${invoice.invoiceNo}${invoice.issueDate.slice(0, 10).replace(/-/g, '')}${invoice.randomCode}${invoice.amountUntaxed.toString(16).padStart(8, '0')}${invoice.amountTotal.toString(16).padStart(8, '0')}${invoice.buyerUbn ? invoice.buyerUbn.padStart(8, '0') : '00000000'}${invoice.sellerUbn}**********`
  const qrRight = `**${invoice.sellerTitle}:1:${invoice.amountTotal}:0`

  const handlePrint = () => {
    window.print()
  }

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
      onClick={onClose}
      data-testid="taiwan-invoice-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 text-slate-900 shadow-2xl ring-1 ring-slate-900/10"
      >
        {/* Top Header Buttons */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <ShieldCheck className="h-4 w-4" />
            <span>{lang === 'zh' ? '財政部電子發票整合服務平台' : 'Ministry of Finance E-Invoice Validated'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Authentic Taiwan Thermal Paper E-GUI Receipt Format */}
        <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 font-mono">
          <div className="text-center">
            <h2 className="text-base font-black tracking-tight text-slate-900">
              {invoice.sellerTitle}
            </h2>
            <h3 className="mt-1 text-sm font-bold tracking-widest text-slate-800">
              電子發票證明聯
            </h3>
            <p className="mt-1 text-xs font-bold text-slate-700">{invoice.period}</p>
            <p className="mt-1.5 text-xl font-black tracking-wider text-slate-900">{invoice.invoiceNo}</p>
          </div>

          <div className="mt-4 space-y-1 text-xs text-slate-700">
            <div className="flex justify-between">
              <span>開立時間:</span>
              <span>{invoice.issueDate}</span>
            </div>
            <div className="flex justify-between">
              <span>隨機碼:</span>
              <span className="font-bold">{invoice.randomCode}</span>
            </div>
            <div className="flex justify-between">
              <span>總計:</span>
              <span className="font-bold">{formatTWD(invoice.amountTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>賣方統編:</span>
              <span>{invoice.sellerUbn}</span>
            </div>
            {invoice.buyerUbn && (
              <>
                <div className="flex justify-between border-t border-slate-200 pt-1 text-purple-700 font-bold">
                  <span>買方統編:</span>
                  <span>{invoice.buyerUbn}</span>
                </div>
                <div className="flex justify-between text-purple-700">
                  <span>買受人抬頭:</span>
                  <span className="truncate max-w-[200px]">{invoice.buyerTitle}</span>
                </div>
              </>
            )}
            {invoice.type === 'B2C' && (
              <div className="flex justify-between text-slate-500">
                <span>載具號碼:</span>
                <span>{invoice.carrierCode}</span>
              </div>
            )}
          </div>

          {/* Barcode Simulator */}
          <div className="mt-4 flex flex-col items-center">
            <div className="flex h-10 w-full items-center justify-center gap-0.5 bg-slate-900 px-2 py-1">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  className="h-full bg-white"
                  style={{ width: `${(i % 3) + 1}px`, margin: '0 1px' }}
                />
              ))}
            </div>
            <span className="mt-1 text-[10px] tracking-widest text-slate-600">
              {invoice.period.replace(/[^0-9]/g, '')}{invoice.invoiceNo}{invoice.randomCode}
            </span>
          </div>

          {/* Dual MOF QR Codes */}
          <div className="mt-4 flex items-center justify-around border-t border-dashed border-slate-300 pt-4">
            <div className="flex flex-col items-center">
              <QRCodeSVG value={qrLeft} size={96} level="M" />
              <span className="mt-1 text-[9px] text-slate-500">主防偽碼 (左)</span>
            </div>
            <div className="flex flex-col items-center">
              <QRCodeSVG value={qrRight} size={96} level="M" />
              <span className="mt-1 text-[9px] text-slate-500">明細密文 (右)</span>
            </div>
          </div>

          {/* Order Reference Footnote */}
          <div className="mt-4 border-t border-slate-200 pt-2 text-center text-[10.5px] text-slate-500">
            <span>訂單編號: {invoice.orderNo} · 走瘋派車智慧科技</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex gap-2">
          <Button
            fullWidth
            variant="secondary"
            onClick={handlePrint}
            data-testid="print-invoice-btn"
            className="flex items-center justify-center gap-1.5 border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"
          >
            <Printer className="h-4 w-4" />
            <span>{lang === 'zh' ? '列印發票證明聯' : 'Print Invoice Proof'}</span>
          </Button>

          <Button
            fullWidth
            variant="primary"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-blue-500/20"
          >
            <span>{lang === 'zh' ? '關閉' : 'Close'}</span>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
