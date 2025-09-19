export type AuthFormState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
};

export const authInitialState: AuthFormState = { status: 'idle' };
