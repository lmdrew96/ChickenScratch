import Image from 'next/image';
import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-12 -mx-6 -mb-6 border-t border-white/10 bg-slate-900/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-white/60 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2">
          <p>Chicken Scratch is a student-run zine for the UD community.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
        <p className="flex items-center gap-2 text-sm">
          Built by <span className="font-fraunces font-bold text-base leading-none">
            <span style={{ color: '#244952' }}>A</span>
            <span style={{ color: '#97D181' }}>D</span>
            <span style={{ color: '#DFA649' }}>H</span>
            <span style={{ color: '#8CBDB9' }}>D</span>
            <span style={{ color: '#DBD5E2' }}>esigns</span>
          </span>
          <Image src="/ADHDesigns-Logo.png" alt="ADHDesigns logo" width={24} height={24} />
        </p>
      </div>
    </footer>
  );
}
