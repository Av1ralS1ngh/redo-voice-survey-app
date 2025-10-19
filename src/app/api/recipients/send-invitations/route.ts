import { NextResponse } from 'next/server';
import { sendInvitationEmail } from '@/lib/email-service';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const extractEmailAddress = (value: string): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/<([^>]+)>/);
  const email = match ? match[1] : trimmed;
  const cleaned = email.replace(/^['\"]|['\"]$/g, '').trim();
  return emailRegex.test(cleaned) ? cleaned : null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawEmails: unknown = body?.emails;
    const link: unknown = body?.link;
    const title: unknown = body?.title;
    const description: unknown = body?.description;

    const emails = Array.isArray(rawEmails)
      ? Array.from(
          new Set(
            rawEmails
              .map((email) => (typeof email === 'string' ? extractEmailAddress(email) : null))
              .filter((email): email is string => Boolean(email))
          )
        )
      : [];

    if (!emails.length) {
      return NextResponse.json({ error: 'Missing or invalid email addresses.' }, { status: 400 });
    }

    if (typeof link !== 'string' || !link.trim()) {
      return NextResponse.json({ error: 'Missing link.' }, { status: 400 });
    }

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Missing title.' }, { status: 400 });
    }

    const normalizedTitle = title.trim();
    const safeDescription = typeof description === 'string' ? description.trim() : '';
    const subject = `Invitation: ${normalizedTitle}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 20px; margin-bottom: 16px;">${normalizedTitle}</h1>
        <p style="margin-bottom: 12px;">${
          safeDescription || 'You have been invited to participate in a voice survey.'
        }</p>
        <p style="margin-bottom: 16px;">Please click the link below to start your interview:</p>
        <p style="margin-bottom: 24px;">
          <a href="${link}" style="color: #2563eb; text-decoration: underline;">${link}</a>
        </p>
        <p style="font-size: 14px; color: #64748b;">If you were not expecting this invitation, you can safely ignore this email.</p>
      </div>
    `;

    const emailText = [
      normalizedTitle,
      '',
      safeDescription || 'You have been invited to participate in a voice survey.',
      '',
      `Start your interview: ${link}`,
    ].join('\n');

    const results = await Promise.allSettled(
      emails.map((email) =>
        sendInvitationEmail({
          to: email,
          subject,
          html: emailHtml,
          text: emailText,
        })
      )
    );

    const failedRecipients = results
      .map((result, index) => ({ result, email: emails[index] }))
      .filter((entry) => entry.result.status === 'rejected')
      .map((entry) => entry.email);

    if (failedRecipients.length === emails.length) {
      return NextResponse.json(
        {
          error: 'Failed to send invitations to all recipients.',
          failedRecipients,
        },
        { status: 500 }
      );
    }

    if (failedRecipients.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Invitations sent to ${emails.length - failedRecipients.length} recipient(s). Failed to send to ${
            failedRecipients.length
          } recipient(s).`,
          failedRecipients,
        },
        { status: 207 }
      );
    }

    return NextResponse.json({ success: true, sentCount: emails.length });
  } catch (error) {
    console.error('Failed to send invitations:', error);
    const message = error instanceof Error ? error.message : 'Failed to send invitations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
