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
            we're here to provide a platform for those voices to be heard.
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
              <h3 className="text-xl font-semibold text-white mb-2">Join Our Team</h3>
              <p className="text-gray-300 leading-relaxed mb-3">
                Interested in being part of the editorial process? We're always looking for passionate 
                students to join our committee as editors, designers, and coordinators.
              </p>
              <Link href="/officers" className="btn inline-flex">
                Meet Our Team
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
            Have questions or want to learn more? We'd love to hear from you!
          </p>
          <p className="text-gray-300">
            Reach out to us through the submission portal or connect with us at our events throughout the year.
          </p>
        </section>
      </div>
    </>
  );
}
