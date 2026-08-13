import { QRCodeSVG } from 'qrcode.react';

interface CanteenQRCodeProps {
  url: string;
}

export default function CanteenQRCode({ url }: CanteenQRCodeProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-50 p-6 text-center">
      <div className="bg-white p-12 rounded-3xl shadow-xl border border-gray-100 max-w-sm w-full flex flex-col items-center">
        <h2 className="text-3xl font-black text-gray-900 mb-1 leading-tight uppercase">
          PICT CANTEEN
        </h2>
        <p className="text-gray-500 font-semibold text-xs mb-4 uppercase tracking-wider">
          Management By: AP CATERERS
        </p>
        <p className="text-blue-600 font-bold text-lg mb-8 tracking-wide uppercase">
          Scan to Order - Skip the Queue
        </p>
        
        <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-gray-100">
          <QRCodeSVG 
            value={url} 
            size={250} 
            level="H"
            includeMargin={true}
            fgColor="#111827" 
            bgColor="#ffffff"
          />
        </div>
        
        <p className="text-gray-400 font-medium text-sm mt-8">
          Point your camera at the QR code<br/>to open the menu
        </p>
      </div>
    </div>
  );
}
