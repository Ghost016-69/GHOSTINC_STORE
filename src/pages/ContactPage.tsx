/**
 * Contact: the details block and the message form.
 *
 * The form writes to `contact_messages`, which migration 003 created as a
 * write-only table: the anon key may INSERT but there is deliberately no
 * SELECT policy, so nobody can read the inbox from the browser (see the
 * migration's header for why).
 */
import { useState, type FormEvent } from 'react'

import { describeError, getSupabase, isConfigured } from '../lib/supabase'
import { usePageTitle } from '../lib/usePageTitle'

interface ContactForm {
  name: string
  email: string
  subject: string
  message: string
}

const EMPTY_FORM: ContactForm = { name: '', email: '', subject: '', message: '' }

export default function ContactPage() {
  usePageTitle('Contact')

  const [form, setForm] = useState<ContactForm>(EMPTY_FORM)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [sending, setSending] = useState(false)

  function setField(field: keyof ContactForm, value: string): void {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setStatus(null)

    const name = form.name.trim()
    const email = form.email.trim()
    const message = form.message.trim()

    if (!name || !email.includes('@') || !message) {
      setStatus({ ok: false, text: 'Name, a valid email address and a message are required.' })
      return
    }
    if (!isConfigured) {
      setStatus({
        ok: false,
        text: 'Supabase is not configured yet, so this message cannot be sent.',
      })
      return
    }

    setSending(true)
    try {
      const { error } = await getSupabase().from('contact_messages').insert({
        name,
        email,
        subject: form.subject.trim() || null,
        message,
      })
      if (error) {
        throw new Error(describeError(error))
      }

      setForm(EMPTY_FORM)
      setStatus({ ok: true, text: 'Message saved. Nothing is emailed — this is a demo store.' })
    } catch (caught) {
      setStatus({ ok: false, text: caught instanceof Error ? caught.message : String(caught) })
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="page-title">Contact GHOSTINC</h1>
      <p className="section-intro">
        Questions about stock, an order, or the code behind the shop? Send a message and it is
        stored in the database, ready to read in the Supabase dashboard.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-base font-bold">Reach us</h2>
          <dl className="mt-3 space-y-3 text-sm text-ghost-text-soft">
            <div>
              <dt className="font-semibold text-ghost-text">Email</dt>
              <dd>hello@ghostinc.example</dd>
            </div>
            <div>
              <dt className="font-semibold text-ghost-text">Phone</dt>
              <dd>+27 31 000 0000</dd>
            </div>
            <div>
              <dt className="font-semibold text-ghost-text">Studio</dt>
              <dd>Level 2, 14 Circuit Road, Durban, 4001</dd>
            </div>
            <div>
              <dt className="font-semibold text-ghost-text">Hours</dt>
              <dd>Monday to Friday, 08:00 to 17:00 SAST</dd>
            </div>
          </dl>
          <p className="notice mt-4 text-xs">
            Demo store: the address, email and phone number above are placeholders.
          </p>
        </div>

        <form className="card space-y-3 p-5" onSubmit={submit}>
          <h2 className="text-base font-bold">Send a message</h2>

          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input
              id="name"
              className="input"
              autoComplete="name"
              required
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="contact-email">Email</label>
            <input
              id="contact-email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(event) => setField('email', event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="subject">Subject</label>
            <input
              id="subject"
              className="input"
              placeholder="Stock, an order, or the code"
              value={form.subject}
              onChange={(event) => setField('subject', event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="message">Message</label>
            <textarea
              id="message"
              className="textarea"
              rows={5}
              required
              value={form.message}
              onChange={(event) => setField('message', event.target.value)}
            />
          </div>

          <p
            className={`form-status ${status ? (status.ok ? 'text-brand' : 'text-sale') : ''}`}
            role="status"
          >
            {status ? status.text : ''}
          </p>

          <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
            {sending ? 'Sending…' : 'Send message'}
          </button>

          <p className="field-hint">
            Messages are saved to the database. Nothing is emailed.
          </p>
        </form>
      </div>
    </section>
  )
}
