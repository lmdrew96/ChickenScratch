'use client';

import { PageHeader } from '@/components/navigation';
import { useState } from 'react';
import { MessageCircle, Instagram, Mail, Send } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
        setErrors({});
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <>
      <PageHeader 
        title="Contact Us" 
        description="Get in touch with the Hen & Ink Society"
        showBackButton={true}
      />
      
      <div className="space-y-8 max-w-4xl">
        {/* Social Media Links */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Connect With Us</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Discord */}
            <a
              href="https://discord.gg/MNpNfa9sPP"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#5865F2] flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white group-hover:text-[var(--accent)] transition-colors">
                  Join our Discord
                </h3>
                <p className="text-sm text-gray-400">Chat with the community</p>
              </div>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/udhen_ink_society?igsh=MWcwbW9yamZkaWdzZg=="
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white group-hover:text-[var(--accent)] transition-colors">
                  Follow on Instagram
                </h3>
                <p className="text-sm text-gray-400">@udhen_ink_society</p>
              </div>
            </a>
          </div>
        </section>

        {/* Leadership Contact */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Leadership Team</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* BBEG */}
            <a
              href="mailto:mbdorsch@udel.edu"
              className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center">
                <Mail className="w-6 h-6 text-[var(--brand)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white group-hover:text-[var(--accent)] transition-colors">
                  BBEG
                </h3>
                <p className="text-sm text-gray-400">President</p>
                <p className="text-sm text-[var(--accent)] mt-1">mbdorsch@udel.edu</p>
              </div>
            </a>

            {/* Dictator-in-Chief */}
            <a
              href="mailto:lmdrew@udel.edu"
              className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center">
                <Mail className="w-6 h-6 text-[var(--brand)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white group-hover:text-[var(--accent)] transition-colors">
                  Dictator-in-Chief
                </h3>
                <p className="text-sm text-gray-400">Vice President</p>
                <p className="text-sm text-[var(--accent)] mt-1">lmdrew@udel.edu</p>
              </div>
            </a>
          </div>
        </section>

        {/* Contact Form */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Send Us a Message</h2>
          
          {submitStatus === 'success' && (
            <div className="mb-6 p-4 rounded-xl bg-green-900/30 border border-green-500 text-green-300">
              <p className="font-semibold">Thanks for reaching out!</p>
              <p className="text-sm mt-1">We&apos;ll get back to you soon.</p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-500 text-red-300">
              <p className="font-semibold">Something went wrong</p>
              <p className="text-sm mt-1">Please try again or email us directly.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-3 text-white placeholder:text-gray-500 focus:border-[var(--accent)] focus:outline-none transition"
                placeholder="Your name"
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-3 text-white placeholder:text-gray-500 focus:border-[var(--accent)] focus:outline-none transition"
                placeholder="your.email@example.com"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-semibold text-gray-300 mb-2">
                Subject <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-3 text-white focus:border-[var(--accent)] focus:outline-none transition"
              >
                <option value="" className="bg-gray-900">Select a subject</option>
                <option value="General Inquiry" className="bg-gray-900">General Inquiry</option>
                <option value="Submission Question" className="bg-gray-900">Submission Question</option>
                <option value="Join the Team" className="bg-gray-900">Join the Team</option>
                <option value="Other" className="bg-gray-900">Other</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-semibold text-gray-300 mb-2">
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={6}
                className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-3 text-white placeholder:text-gray-500 focus:border-[var(--accent)] focus:outline-none transition resize-none"
                placeholder="Tell us what&apos;s on your mind..."
              />
              {errors.message && (
                <p className="mt-2 text-sm text-red-400">{errors.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-accent inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
