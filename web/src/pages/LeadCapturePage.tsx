import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { CheckCircle2, Send } from 'lucide-react';
import { useCreateOnlineLead } from '@/hooks/useApi';

type LeadForm = {
  company: string;
  name: string;
  phone: string;
  email: string;
  project: string;
  message: string;
};

const initialForm: LeadForm = {
  company: '',
  name: '',
  phone: '',
  email: '',
  project: '',
  message: '',
};

export function LeadCapturePage() {
  const [params] = useSearchParams();
  const companyFromUrl = useMemo(() => params.get('company') || params.get('c') || '', [params]);
  const [form, setForm] = useState<LeadForm>({ ...initialForm, company: companyFromUrl });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const createLead = useCreateOnlineLead();

  const updateField = (field: keyof LeadForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
    setSuccess(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const company = form.company.trim();
    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!company) {
      setError('Company name is required.');
      return;
    }
    if (!name && !phone && !email) {
      setError('Please share your name, phone, or email.');
      return;
    }

    createLead.mutate(
      {
        company,
        name,
        phone,
        email,
        project: form.project.trim(),
        message: form.message.trim(),
        source: 'Website',
      },
      {
        onSuccess: () => {
          setSuccess(true);
          setError('');
          setForm({ ...initialForm, company });
        },
        onError: (err) => {
          const apiMessage = isAxiosError(err)
            ? err.response?.data?.error || err.response?.data?.message || err.message
            : 'Could not send your details. Please try again.';
          setError(apiMessage);
        },
      }
    );
  };

  return (
    <main className="lead-capture-page">
      <section className="lead-capture-shell">
        <div className="lead-capture-intro">
          <div className="lead-capture-kicker">Nova CRM</div>
          <h1>Talk to our team</h1>
          <p>Share your details and the right company team will follow up from their CRM dashboard.</p>
        </div>

        <form className="lead-capture-form" onSubmit={submit}>
          {success && (
            <div className="form-success">
              <CheckCircle2 size={18} />
              Your details were submitted successfully.
            </div>
          )}
          {error && <div className="form-error">{error}</div>}

          <label className="form-field">
            <span>Company</span>
            <input
              className="form-input"
              value={form.company}
              onChange={(event) => updateField('company', event.target.value)}
              placeholder="Acme Realty"
              required
            />
          </label>

          <div className="lead-capture-grid">
            <label className="form-field">
              <span>Name</span>
              <input
                className="form-input"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Your name"
              />
            </label>
            <label className="form-field">
              <span>Phone</span>
              <input
                className="form-input"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="+91 98765 43210"
              />
            </label>
          </div>

          <label className="form-field">
            <span>Email</span>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="form-field">
            <span>Interested in</span>
            <input
              className="form-input"
              value={form.project}
              onChange={(event) => updateField('project', event.target.value)}
              placeholder="Project, service, or requirement"
            />
          </label>

          <label className="form-field">
            <span>Message</span>
            <textarea
              className="form-input"
              rows={5}
              value={form.message}
              onChange={(event) => updateField('message', event.target.value)}
              placeholder="Tell us what you need help with"
            />
          </label>

          <button className="btn btn-primary btn-lg lead-capture-submit" type="submit" disabled={createLead.isPending}>
            <Send size={18} />
            {createLead.isPending ? 'Sending...' : 'Send details'}
          </button>
        </form>
      </section>
    </main>
  );
}
