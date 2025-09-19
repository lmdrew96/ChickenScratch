import { randomUUID } from 'crypto';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run the seed.');
}

const supabase = createClient<Database>(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const users = [
    {
      email: 'student@udel.edu',
      password: 'Password123!',
      role: 'student' as const,
      name: 'Sample Student',
    },
    {
      email: 'editor@udel.edu',
      password: 'Password123!',
      role: 'editor' as const,
      name: 'Sample Editor',
    },
    {
      email: 'admin@dtcc.edu',
      password: 'Password123!',
      role: 'admin' as const,
      name: 'Site Admin',
    },
  ];

  type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
  type SubmissionInsert = Database['public']['Tables']['submissions']['Insert'];

  const existingUsersResponse = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existingUsers = existingUsersResponse.data?.users ?? [];

  const userRecords: Record<string, string> = {};

  for (const user of users) {
    const match = existingUsers.find((candidate) => candidate.email?.toLowerCase() === user.email.toLowerCase());
    if (match) {
      userRecords[user.role] = match.id;
    } else {
      const created = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        user_metadata: { name: user.name },
        email_confirm: true,
      });
      if (created.error || !created.data.user) {
        throw created.error ?? new Error(`Failed to create user ${user.email}`);
      }
      userRecords[user.role] = created.data.user.id;
    }

    const profilePayload: ProfileInsert = {
      id: userRecords[user.role],
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const profileUpdate = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
    if (profileUpdate.error) {
      throw profileUpdate.error;
    }
  }

  const submissions: SubmissionInsert[] = [
    {
      id: randomUUID(),
      owner_id: userRecords.student,
      title: 'Spring Echoes',
      type: 'writing',
      summary: 'A short reflection on late-night campus walks.',
      text_body: 'The lamplight hums while the campus sleeps...\n\n(500 words of example text)',
      status: 'submitted',
      art_files: [],
    },
    {
      id: randomUUID(),
      owner_id: userRecords.student,
      title: 'Tunnel Sketches',
      type: 'visual',
      summary: 'Charcoal illustrations inspired by student life.',
      status: 'needs_revision',
      editor_notes: 'Add a short artist statement for context.',
      assigned_editor: userRecords.editor,
      art_files: [],
    },
    {
      id: randomUUID(),
      owner_id: userRecords.student,
      title: 'Library Zine Spread',
      type: 'visual',
      summary: 'Collage exploring the library archives.',
      status: 'published',
      published: true,
      published_url: 'https://example.com/library-zine',
      issue: 'Spring 2025',
      art_files: [],
    },
  ];

  for (const submission of submissions) {
    const submissionId = submission.id ?? randomUUID();
    const payload: SubmissionInsert = { ...submission, id: submissionId };

    const insert = await supabase
      .from('submissions')
      .upsert(payload, { onConflict: 'id' })
      .select('id');
    if (insert.error) {
      throw insert.error;
    }

    if (submission.type === 'visual') {
      const fileContent = `Placeholder asset for ${submission.title}`;
      const filePath = `${submission.owner_id}/${submissionId}/sample.txt`;
      await supabase.storage.from('art').upload(filePath, new Blob([fileContent]), { upsert: true });
      await supabase
        .from('submissions')
        .update({ art_files: [filePath] })
        .eq('id', submissionId);
    }
  }

  console.log('Seed complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
