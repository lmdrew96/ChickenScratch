export type ToolkitLink = {
  label: string;
  configKey: string;
};

export type QuickAction = {
  label: string;
  icon: string;
  href?: string;
  action?: string;
  description: string;
};

export type RecurringTaskItem = {
  id: string;
  label: string;
};

export type RecurringTaskGroup = {
  cadence: string;
  items: RecurringTaskItem[];
};

export type ToolkitRole = {
  slug: string;
  position: string;
  title: string;
  roleName: string;
  overview: string;
  responsibilities: string[];
  recurringTasks: RecurringTaskGroup[];
  handoffChecklist: string[];
  quickLinks: ToolkitLink[];
  quickActions: QuickAction[];
};

export const officerToolkits: ToolkitRole[] = [
  {
    slug: 'president',
    position: 'BBEG',
    title: 'President',
    roleName: 'BBEG',
    overview: 'The Big Bad Evil Guy who brings the party together. You are the face of the organization, the primary liaison with the university, and the creative director for our weekly gatherings.',
    responsibilities: [
      'Lead every group meeting',
      'Plan creative writing activity per meeting',
      'Oversee Chicken Scratch proofreading/editing',
      'Cast deciding vote on tied votes',
      'Complete club registration/paperwork',
      'Oversee Discord moderation'
    ],
    recurringTasks: [
      {
        cadence: 'Weekly',
        items: [
          { id: 'president-weekly-prompt', label: 'Draft creative writing prompt (1 per week)' },
          { id: 'president-weekly-creative-meeting', label: 'Run weekly creative writing meeting' },
          { id: 'president-weekly-meeting', label: 'Run regular weekly meeting' },
        ],
      },
      {
        cadence: 'Bi-weekly',
        items: [
          { id: 'president-biweekly-officer-meeting', label: 'Run officer meeting' },
        ],
      },
      {
        cadence: 'Monthly',
        items: [
          { id: 'president-monthly-advisor', label: 'Check in with faculty advisor' },
        ],
      },
      {
        cadence: 'Per Semester',
        items: [
          { id: 'president-semester-elections', label: 'Lead elections (Spring)' },
          { id: 'president-semester-rso', label: 'RSO re-registration' },
        ],
      },
      {
        cadence: 'Annually',
        items: [
          { id: 'president-annual-constitution', label: 'Constitution review' },
        ],
      },
    ],
    handoffChecklist: [
      'Transfer ownership of Discord server',
      'Pass over RSO portal admin access',
      'Introduce new BBEG to the faculty advisor'
    ],
    quickLinks: [
      { label: 'RSO Registration Portal', configKey: 'toolkit_president_rso' },
      { label: 'University Event Policies', configKey: 'toolkit_president_policies' },
      { label: 'Discord Settings (Requires Admin)', configKey: 'toolkit_president_discord' }
    ],
    quickActions: [
      { label: 'Schedule meeting', icon: 'Calendar', href: '/officers#meetings', description: 'Create a new meeting proposal' },
      { label: 'Post announcement', icon: 'Megaphone', href: '/officers#announcements', description: 'Broadcast to the team' },
      { label: 'Review submissions', icon: 'FileText', href: '/committee', description: 'Check the pipeline' },
      { label: 'Create task', icon: 'ListTodo', href: '/officers#tasks', description: 'Assign work to the team' },
    ],
  },
  {
    slug: 'treasurer',
    position: 'Dictator-in-Chief',
    title: 'Treasurer',
    roleName: 'Dictator-in-Chief',
    overview: 'Keeper of the coin and the microphone. You ensure we have the funds to thrive and the attention to survive while stepping up to lead when the BBEG goes down.',
    responsibilities: [
      'Lead meetings when President is absent',
      'Deliver announcements each meeting',
      'Monitor spending/income (using the university-provided ledger)',
      'Submit reimbursements to Student Involvement Office',
      'Request allocation board funds',
      'Coordinate fundraisers & events',
      'Manage Chicken Scratch advertising space'
    ],
    recurringTasks: [
      {
        cadence: 'Per Meeting',
        items: [
          { id: 'treasurer-permeeting-announcements', label: 'Deliver announcements' },
          { id: 'treasurer-permeeting-dues', label: 'Collect dues/donations (Cash, check, or card only)' },
        ],
      },
      {
        cadence: 'Per Issue',
        items: [
          { id: 'treasurer-perissue-ad-coord', label: 'Ad coordination and invoicing' },
        ],
      },
      {
        cadence: 'Ongoing',
        items: [
          { id: 'treasurer-ongoing-ledger', label: 'Ledger reviews' },
          { id: 'treasurer-ongoing-reimbursements', label: 'Process reimbursements' },
        ],
      },
      {
        cadence: 'Per Semester',
        items: [
          { id: 'treasurer-semester-budget', label: 'Submit budget requests to Allocation Board' },
        ],
      },
    ],
    handoffChecklist: [
      'Complete Student Involvement financial transition forms.',
      'Inform new treasurer to watch out for the ledger sent by the University.',
      'Hand over cash box and square reader (if applicable).'
    ],
    quickLinks: [
      { label: 'SIO Finance Portal', configKey: 'toolkit_treasurer_sio' },
      { label: 'Reimbursement Forms', configKey: 'toolkit_treasurer_reimbursement' }
    ],
    quickActions: [
      { label: 'Post announcement', icon: 'Megaphone', href: '/officers#announcements', description: 'Meeting announcements' },
      { label: 'Review submissions', icon: 'FileText', href: '/committee', description: 'Check the pipeline' },
      { label: 'Create task', icon: 'ListTodo', href: '/officers#tasks', description: 'Assign work to the team' },
      { label: 'Manage users', icon: 'Users', href: '/admin', description: 'Roles and membership' },
    ],
  },
  {
    slug: 'secretary',
    position: 'Scroll Gremlin',
    title: 'Secretary',
    roleName: 'Scroll Gremlin',
    overview: 'The archivist, the scribe, the keeper of lore. If you don\'t write it down, it didn\'t happen. You maintain the lifeblood of our membership data and history.',
    responsibilities: [
      'Record minutes for every group meeting',
      'Maintain membership list & email database',
      'Oversee Chicken Scratch digital & print archive',
      'Track attendance',
      'Maintain "meeting-minutes" Discord channel'
    ],
    recurringTasks: [
      {
        cadence: 'Per Meeting',
        items: [
          { id: 'secretary-permeeting-minutes', label: 'Take minutes' },
          { id: 'secretary-permeeting-attendance', label: 'Track attendance' },
          { id: 'secretary-permeeting-discord', label: 'Post minutes to Discord' },
        ],
      },
      {
        cadence: 'Per Issue',
        items: [
          { id: 'secretary-perissue-archives', label: 'Update digital & print archives' },
        ],
      },
      {
        cadence: 'Ongoing',
        items: [
          { id: 'secretary-ongoing-membership', label: 'Membership list upkeep' },
          { id: 'secretary-ongoing-inquiries', label: 'Respond to new member inquiries' },
        ],
      },
    ],
    handoffChecklist: [
      'Transfer Google Drive / Notion ownership.',
      'Hand over physical archives (zinemakery kit, records, etc.).',
      'Ensure permissions to the Email database/list-serv are granted to the successor.'
    ],
    quickLinks: [
      { label: 'Attendance Tracker', configKey: 'toolkit_secretary_attendance' },
      { label: 'Membership Database', configKey: 'toolkit_secretary_membership_db' },
      { label: 'Google Drive', configKey: 'toolkit_secretary_drive' }
    ],
    quickActions: [
      { label: 'Review submissions', icon: 'FileText', href: '/committee', description: 'Check the pipeline' },
      { label: 'View members', icon: 'Users', href: '/admin', description: 'Membership database' },
      { label: 'Published archive', icon: 'BookOpen', href: '/published', description: 'All published works' },
      { label: 'Post announcement', icon: 'Megaphone', href: '/officers#announcements', description: 'Team updates' },
    ],
  },
  {
    slug: 'pr-chair',
    position: 'PR Nightmare',
    title: 'PR Chair',
    roleName: 'PR Nightmare',
    overview: 'The loud one. Your job is to make sure no one on campus can ignore the Hen & Ink Society. You control our aesthetic, our outreach, and our public existence.',
    responsibilities: [
      'Promote all meetings and events',
      'Create posters/flyers/brochures',
      'Distribute Chicken Scratch digitally and in print',
      'Maintain all social media and web presence',
      'Handle media inquiries'
    ],
    recurringTasks: [
      {
        cadence: 'Per Event',
        items: [
          { id: 'pr-perevent-promo', label: 'Create promotional materials' },
          { id: 'pr-perevent-socials', label: 'Post to socials' },
          { id: 'pr-perevent-flyers', label: 'Print flyers' },
        ],
      },
      {
        cadence: 'Per Issue',
        items: [
          { id: 'pr-perissue-distribution', label: 'Orchestrate distribution strategy (campus drop-offs)' },
        ],
      },
      {
        cadence: 'Ongoing',
        items: [
          { id: 'pr-ongoing-social', label: 'Social media engagement' },
          { id: 'pr-ongoing-dms', label: 'Answer DMs' },
        ],
      },
    ],
    handoffChecklist: [
      'Pass over Instagram/Social credentials via secure password sharing.',
      'Share Canva Pro team access or design templates.',
      'Hand off any remaining flyers or campus distribution lists.'
    ],
    quickLinks: [
      { label: 'Canva', configKey: 'toolkit_pr_canva' },
      { label: 'Instagram', configKey: 'toolkit_pr_instagram' },
      { label: 'University Flyering Guidelines', configKey: 'toolkit_pr_flyering' },
      { label: 'Linktree', configKey: 'toolkit_pr_linktree' }
    ],
    quickActions: [
      { label: 'Published works', icon: 'BookOpen', href: '/published', description: 'Share-ready content' },
      { label: 'Post announcement', icon: 'Megaphone', href: '/officers#announcements', description: 'Promo coordination' },
      { label: 'Review submissions', icon: 'FileText', href: '/committee', description: 'Check the pipeline' },
      { label: 'Create task', icon: 'ListTodo', href: '/officers#tasks', description: 'Distribution tasks' },
    ],
  }
];
