'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Check, Plus, X } from 'lucide-react';

interface MeetingProposal {
  id: string;
  title: string;
  description: string;
  proposed_dates: Array<{ date: string; time: string }>;
  finalized_date: string | null;
  created_by: string;
  created_at: string;
  officer_availability: Array<{
    id: string;
    user_id: string;
    available_slots: number[];
    user_profile: { display_name: string; email: string };
  }>;
}

export function MeetingScheduler({ userId }: { userId: string }) {
  const [proposals, setProposals] = useState<MeetingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    proposed_dates: [
      { date: '', time: '' },
      { date: '', time: '' },
      { date: '', time: '' },
    ],
  });

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const response = await fetch('/api/officer/meetings');
      if (response.ok) {
        const data = await response.json();
        setProposals(data.proposals || []);
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validDates = formData.proposed_dates.filter(d => d.date && d.time);
    if (validDates.length < 2) {
      alert('Please provide at least 2 date/time options');
      return;
    }

    try {
      const response = await fetch('/api/officer/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          proposed_dates: validDates,
        }),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setFormData({
          title: '',
          description: '',
          proposed_dates: [
            { date: '', time: '' },
            { date: '', time: '' },
            { date: '', time: '' },
          ],
        });
        fetchProposals();
      }
    } catch (error) {
      console.error('Error creating proposal:', error);
    }
  };

  const handleMarkAvailability = async (proposalId: string, slotIndexes: number[]) => {
    try {
      const response = await fetch(`/api/officer/meetings/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available_slots: slotIndexes }),
      });

      if (response.ok) {
        fetchProposals();
      }
    } catch (error) {
      console.error('Error marking availability:', error);
    }
  };

  const handleFinalizeMeeting = async (proposalId: string, dateTime: string) => {
    try {
      const response = await fetch(`/api/officer/meetings/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalized_date: dateTime }),
      });

      if (response.ok) {
        fetchProposals();
      }
    } catch (error) {
      console.error('Error finalizing meeting:', error);
    }
  };

  const handleWithdrawProposal = async (proposalId: string) => {
    if (!confirm('Withdraw this meeting proposal? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/officer/meetings/${proposalId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchProposals();
      }
    } catch (error) {
      console.error('Error withdrawing proposal:', error);
    }
  };

  if (loading) {
    return <div className="text-slate-300">Loading meetings...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Team Meeting Scheduler
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
        >
          {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreateForm ? 'Cancel' : 'Create Proposal'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateProposal} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Meeting Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/20 focus:outline-none"
              placeholder="e.g., Q1 Planning Meeting"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/20 focus:outline-none"
              rows={3}
              placeholder="Meeting agenda and details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Proposed Date/Time Options (at least 2) *
            </label>
            <div className="space-y-2">
              {formData.proposed_dates.map((slot, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="date"
                    value={slot.date}
                    onChange={(e) => {
                      const newDates = [...formData.proposed_dates];
                      const entry = newDates[index];
                      if (entry) entry.date = e.target.value;
                      setFormData({ ...formData, proposed_dates: newDates });
                    }}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/20 focus:outline-none"
                  />
                  <input
                    type="time"
                    value={slot.time}
                    onChange={(e) => {
                      const newDates = [...formData.proposed_dates];
                      const entry = newDates[index];
                      if (entry) entry.time = e.target.value;
                      setFormData({ ...formData, proposed_dates: newDates });
                    }}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/20 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/20 transition-colors"
          >
            Create Meeting Proposal
          </button>
        </form>
      )}

      <div className="space-y-4">
        {proposals.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
            No meeting proposals yet. Create one to get started!
          </div>
        ) : (
          proposals.map((proposal) => (
            <MeetingProposalCard
              key={proposal.id}
              proposal={proposal}
              userId={userId}
              onMarkAvailability={handleMarkAvailability}
              onFinalize={handleFinalizeMeeting}
              onWithdraw={handleWithdrawProposal}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MeetingProposalCard({
  proposal,
  userId,
  onMarkAvailability,
  onFinalize,
  onWithdraw,
}: {
  proposal: MeetingProposal;
  userId: string;
  onMarkAvailability: (proposalId: string, slots: number[]) => void;
  onFinalize: (proposalId: string, dateTime: string) => void;
  onWithdraw: (proposalId: string) => void;
}) {
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const userAvailability = proposal.officer_availability.find(a => a.user_id === userId);

  useEffect(() => {
    if (userAvailability) {
      setSelectedSlots(userAvailability.available_slots);
    }
  }, [userAvailability]);

  const toggleSlot = (index: number) => {
    const newSlots = selectedSlots.includes(index)
      ? selectedSlots.filter(i => i !== index)
      : [...selectedSlots, index];
    setSelectedSlots(newSlots);
  };

  const saveAvailability = () => {
    onMarkAvailability(proposal.id, selectedSlots);
  };

  const getSlotAvailability = (index: number) => {
    return proposal.officer_availability.filter(a => a.available_slots.includes(index));
  };

  const getMostPopularSlot = () => {
    const counts = proposal.proposed_dates.map((_, index) => ({
      index,
      count: getSlotAvailability(index).length,
    }));
    const first = counts[0];
    if (!first) return { index: 0, count: 0 };
    return counts.reduce((max, curr) => (curr.count > max.count ? curr : max), first);
  };

  const mostPopular = getMostPopularSlot();

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{proposal.title}</h3>
          {proposal.description && (
            <p className="text-sm text-slate-300 mt-1">{proposal.description}</p>
          )}
        </div>
        {proposal.created_by === userId && !proposal.finalized_date && (
          <button
            onClick={() => onWithdraw(proposal.id)}
            className="shrink-0 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Withdraw
          </button>
        )}
      </div>

      {proposal.finalized_date ? (
        <div className="rounded-lg bg-green-500/20 border border-green-500/30 p-4">
          <div className="flex items-center gap-2 text-green-400 font-medium">
            <Check className="h-5 w-5" />
            Meeting Finalized
          </div>
          <p className="text-sm text-slate-300 mt-1">
            {new Date(proposal.finalized_date).toLocaleString()}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {proposal.proposed_dates.map((slot, index) => {
              const availability = getSlotAvailability(index);
              const isMostPopular = index === mostPopular.index && mostPopular.count > 0;
              const isSelected = selectedSlots.includes(index);

              return (
                <div
                  key={index}
                  className={`rounded-lg border p-4 transition-colors ${
                    isMostPopular
                      ? 'border-green-500/50 bg-green-500/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleSlot(index)}
                        className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
                          isSelected
                            ? 'border-white bg-white text-black'
                            : 'border-white/30 hover:border-white/50'
                        }`}
                      >
                        {isSelected && <Check className="h-4 w-4" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2 text-white font-medium">
                          <Clock className="h-4 w-4" />
                          {new Date(slot.date + 'T' + slot.time).toLocaleString()}
                        </div>
                        {isMostPopular && (
                          <span className="text-xs text-green-400">Most popular time</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Users className="h-4 w-4" />
                      {availability.length} available
                    </div>
                  </div>
                  {availability.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {availability.map((a) => (
                        <span
                          key={a.id}
                          className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300"
                        >
                          {a.user_profile.display_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveAvailability}
              className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
            >
              Save My Availability
            </button>
            {mostPopular.count > 0 && (
              <button
                onClick={() => {
                  const slot = proposal.proposed_dates[mostPopular.index];
                  if (!slot) return;
                  const dateTime = new Date(slot.date + 'T' + slot.time).toISOString();
                  if (confirm('Finalize this meeting time?')) {
                    onFinalize(proposal.id, dateTime);
                  }
                }}
                className="rounded-lg bg-green-500/20 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-500/30 transition-colors"
              >
                Finalize Meeting
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
