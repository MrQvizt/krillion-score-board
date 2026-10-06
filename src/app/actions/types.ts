export type FormState = {
  error?: string;
  success?: string;
  /** Echo back values so the form can keep what the user typed. */
  values?: Record<string, string>;
};

export const idle: FormState = {};
