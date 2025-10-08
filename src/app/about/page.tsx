import { PageHeader } from '@/components/navigation';
import Link from 'next/link';

export const metadata = { 
  title: 'About Us - Hen & Ink Society',
  description: 'Learn about the Hen & Ink Society and Chicken Scratch zine'
};

export default function AboutPage() {
  return (
    <>
      <PageHeader 
        title="About Us" 
        description="The story behind Hen & Ink Society and Chicken Scratch"
        showBackButton={true}
      />
      
      <div className="space-y-8 max-w-4xl">
        {/* Mission Statement */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-gray-300 leading-relaxed text-lg">
            We began this zine as a way to collect student creative works and share them with our community. 
            Our goal is to inspire not only our readers, but each other. Being college students, we all spend 
            a lot of time reading and writing because we have to, not necessarily because we want to. 
            Unfortunately, this can take all of the enjoyment out of some pretty important forms of self-expression. 
            The Hen & Ink Society and Chicken Scratch are our way of taking back our creativity and using it to 
            uplift and support our community.
          </p>
        </section>

        {/* About Hen & Ink Society */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Hen & Ink Society</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            The Hen & Ink Society is a student-run organization dedicated to fostering creativity and 
            literary expression within our community. We believe that everyone has a story to tell, and 
            we&apos;re here to provide a platform for those voices to be heard.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Through workshops, events, and our publication Chicken Scratch, we create spaces where 
            students can explore their creativity, share their work, and connect with fellow writers 
            and artists. We celebrate all forms of creative expression, from poetry and prose to 
            visual art and multimedia projects.
          </p>
        </section>

        {/* About Chicken Scratch */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Chicken Scratch Zine</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Chicken Scratch is our flagship publication—a student-run literary and arts zine that 
            showcases the incredible talent within our community. Each issue features a diverse 
            collection of poetry, short stories, essays, artwork, and photography submitted by students.
          </p>
          <p className="text-gray-300 leading-relaxed">
            We publish regularly throughout the academic year, and every submission goes through a 
            thoughtful review process by our editorial committee. Our goal is to maintain high 
            standards while remaining accessible and encouraging to writers and artists at all 
            skill levels.
          </p>
        </section>

        {/* How to Get Involved */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Get Involved</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Submit Your Work</h3>
              <p className="text-gray-300 leading-relaxed mb-3">
                We accept submissions of poetry, prose, visual art, and more. Share your creativity 
                with our community and see your work published in Chicken Scratch.
              </p>
              <Link href="/submit" className="btn btn-accent inline-flex">
                Submit Your Work
              </Link>
            </div>

            <div className="pt-4">
              <h3 className="text-xl font-semibold text-white mb-2">Read Published Works</h3>
              <p className="text-gray-300 leading-relaxed mb-3">
                Explore our collection of published pieces and discover the amazing talent in our community.
              </p>
              <Link href="/published" className="btn inline-flex">
                View Published Works
              </Link>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Have questions or want to learn more? We&apos;d love to hear from you!
          </p>
          <p className="text-gray-300 mb-6">
            Reach out to us through the submission portal or connect with us at our events throughout the year.
          </p>
          
          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <svg 
              className="w-6 h-6 text-[var(--accent)]" 
              fill="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <div>
              <a 
                href="https://discord.gg/MNpNfa9sPP" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:text-[#e6bb00] font-semibold transition-colors"
              >
                Join our Discord community
              </a>
              <p className="text-sm text-gray-400">Chat with us and stay updated on events and submissions</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
