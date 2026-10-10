import React, { useState } from 'react';
import { ClipboardPaste, Sparkles, Trash2, ArrowRight } from 'lucide-react';

const SAMPLE_PATTERN_A = `188
SPXOCL008502621282730080
1009-RYY009-batch6687:B
RYY - Palladium First Corp
RYY
-
******, ******, GA 30008
-
-
2026-10-09 07:21:05
Nassli Carolaen Florez
-
No
-
NEW`;

const SAMPLE_PATTERN_B = `Seq # | Tracking # | Route | Fleet | DSP | Deviation | Address | Unit | Dropoff Location | Last Event Time | Scheduled Driver | DNR | Risk | Bad Pod | Status | Final Status | Exception reasons | Driver Notes | Customer Note
1
SPXRYY126902737040
B-1009-RYY-MIX-061827
RYY - Palladium First Corp
RYY
134m
******, ******, MARIETTA, GA 30060
-
Side door
2026-10-09 08:10:53
Queena Peeples
-
No
No
FAILED ATTEMPT
FAILED ATTEMPT
No Access/No Safe Location and unable to contact the consignee
I think is wrong address...
-`;

export function SmartPasteArea({ onParseText, isLoading }) {
  const [text, setText] = useState('');

  const handlePaste = (e) => {
    // Optional immediate auto-parse when pasting
    const pasted = e.clipboardData.getData('text');
    if (pasted && pasted.includes('SPX')) {
      // Let state update then parse
      setTimeout(() => onParseText(pasted), 100);
    }
  };

  const handleManualParse = () => {
    if (text.trim()) {
      onParseText(text);
    }
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
            <ClipboardPaste className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">Universal Smart Paste Engine</h3>
            <p className="text-xs text-zinc-400">
              Paste raw DOM table tokens copied from SpeedX POS (Ctrl + V). Anchors on <code className="text-sky-300 font-mono">/SPX[A-Z0-9]+/</code>.
            </p>
          </div>
        </div>

        {/* Preset buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-medium">Quick Presets:</span>
          <button
            type="button"
            onClick={() => { setText(SAMPLE_PATTERN_A); onParseText(SAMPLE_PATTERN_A); }}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
          >
            Pattern A (Manifest)
          </button>
          <button
            type="button"
            onClick={() => { setText(SAMPLE_PATTERN_B); onParseText(SAMPLE_PATTERN_B); }}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
          >
            Pattern B (Failed)
          </button>
        </div>
      </div>

      <div className="relative">
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          placeholder="Paste raw SpeedX clipboard text here (e.g. Seq #, SPX Barcode, Address, Driver, Status, Notes)..."
          className="w-full bg-zinc-950 border border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl p-3.5 text-xs text-zinc-200 placeholder:text-zinc-600 font-mono transition resize-y"
        />

        {text && (
          <button
            type="button"
            onClick={() => setText('')}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition"
            title="Clear text"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-zinc-500">
          {text ? `${text.split('\n').filter(Boolean).length} lines detected` : 'Ready for input'}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!text.trim() || isLoading}
            onClick={handleManualParse}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-600/20 transition"
          >
            {isLoading ? (
              <span>Parsing Engine...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Parse Textarea</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
