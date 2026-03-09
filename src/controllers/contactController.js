const { sendEmail } = require('../config/mailer');
const supabase = require('../config/supabase');

/**
 * POST /api/contact
 * Public — submits a contact form, saves to DB and sends email to admin
 */
const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // Save to DB
    await supabase.from('contact_messages').insert([{ name, email, subject, message }]);

    // Send notification email to church admin
    await sendEmail({
      to: process.env.CONTACT_RECIPIENT,
      subject: `[Website Contact] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">MFM Ifesowapo — New Contact Message</h2>
          </div>
          <div style="padding: 30px; background: #f9f9f9; border: 1px solid #ddd;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; width: 100px;">From:</td>
                <td style="padding: 10px 0;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555;">Email:</td>
                <td style="padding: 10px 0;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555;">Subject:</td>
                <td style="padding: 10px 0;">${subject}</td>
              </tr>
            </table>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <h3 style="color: #333;">Message:</h3>
            <p style="color: #444; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          <div style="padding: 15px; background: #eee; text-align: center; font-size: 12px; color: #888;">
            Received via MFM Ifesowapo website contact form
          </div>
        </div>
      `,
    });

    // Auto-reply to sender
    await sendEmail({
      to: email,
      subject: 'We received your message — MFM Ifesowapo',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">MFM Ifesowapo Regional Headquarters</h2>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <p>Dear <strong>${name}</strong>,</p>
            <p>Thank you for reaching out to us. We have received your message and will get back to you shortly.</p>
            <p>Your message was:</p>
            <blockquote style="border-left: 4px solid #c8a96e; padding-left: 15px; color: #555; font-style: italic;">
              ${message}
            </blockquote>
            <p>God bless you.</p>
            <p><strong>MFM Ifesowapo Team</strong></p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true, message: 'Your message has been sent. We will get back to you soon.' });
  } catch (err) {
    console.error('[CONTACT] Submit error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
  }
};

module.exports = { submitContact };
