import { Resend } from 'resend';

const DEFAULT_FROM = () => `Voice Survey <${process.env.EMAIL_FROM || 'onboarding@resend.dev'}>`;

const htmlToPlainText = (html: string): string => {
  return html
    .replace(/<br\s*\/?>(?=\s*<)/gi, '\n')
    .replace(/<br\s*\/?>(?!\s*<)/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/(p|div|h\d|li)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const createResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('Resend API key is not configured. Set RESEND_API_KEY in your environment.');
  }

  return new Resend(apiKey);
};

export async function sendInvitationEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    const resend = createResendClient();
    const payload = {
      from: DEFAULT_FROM(),
      to,
      subject,
      html,
      text: text ?? htmlToPlainText(html),
    } as const;

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error('Error sending email with Resend:', error);
      throw new Error(error.message || 'Failed to send email');
    }

    if (!data?.id) {
      console.warn('Email sent but response did not include a message ID.');
    }

    return { success: true, messageId: data?.id ?? null };
  } catch (error) {
    console.error('Error sending email:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to send email');
  }
}
