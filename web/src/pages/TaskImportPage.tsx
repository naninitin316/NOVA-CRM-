import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { ArrowLeft, FileUp, Upload } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { useCreateLeadTasks, useUsers } from '@/hooks/useApi';
import type { LeadTaskInput, Priority } from '@/types';

type AssignmentMode = 'ROUND_ROBIN' | 'MANUAL';
type Department = 'Sales' | 'HR' | 'IT' | 'Administration' | 'Finance' | 'Engineering' | 'Marketing' | 'Support';

const FIELD_ALIASES: Record<keyof LeadTaskInput, string[]> = {
  customerName: ['name', 'customer name', 'customer', 'lead name', 'client name'],
  customerPhone: ['phone', 'mobile', 'contact', 'contact number', 'phone number', 'mobile number'],
  customerEmail: ['email', 'email address'],
  customerCompany: ['company', 'organization', 'business', 'project name', 'property', 'property name'],
  customerSource: ['source', 'lead source', 'type of lead', 'contacted by'],
  description: ['description', 'notes', 'details', 'message details', 'brief desc.', 'brief desc', 'subject', 'interested in'],
  remarks: ['comment', 'remarks', 'remark', 'status', 'any other details', 'plan to buy', 'budget'],
  assignedTo: ['assignedto', 'assigned to', 'assignee id'],
};
const TEAM_ROLES = ['MEMBER', 'CONTRIBUTOR', 'SALES_TEAM', 'HR_TEAM'] as const;

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const isValidEmail = (value?: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const readLeadRows = async (file: File) => {
  const rows = parseCsv(await file.text());
  return mapLeadRows(rows);
};

const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      currentRow.push(currentCell.trim());
      if (currentRow.some(Boolean)) rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some(Boolean)) rows.push(currentRow);
  return rows;
};

const mapLeadRows = (rows: string[][]): LeadTaskInput[] => {
  const [headers = [], ...body] = rows;
  const normalized = headers.map(normalizeHeader);

  return body.map((row) => {
    const lead: LeadTaskInput = {};
    Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
      const index = normalized.findIndex((header) => aliases.includes(header));
      if (index >= 0 && row[index]) {
        lead[field as keyof LeadTaskInput] = row[index];
      }
    });
    if (!isValidEmail(lead.customerEmail)) delete lead.customerEmail;
    return lead;
  }).filter((lead) =>
    Boolean(lead.customerName || lead.customerPhone || lead.customerEmail || lead.customerCompany)
  );
};

export function TaskImportPage() {
  const navigate = useNavigate();
  const { data: users } = useUsers();
  const createLeadTasks = useCreateLeadTasks();
  const [leads, setLeads] = useState<LeadTaskInput[]>([]);
  const [fileName, setFileName] = useState('');
  const [department, setDepartment] = useState<Department>('Sales');
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('ROUND_ROBIN');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const teamMembers = useMemo(
    () => (users || []).filter((user) => user.isActive && TEAM_ROLES.includes(user.role as (typeof TEAM_ROLES)[number]) && user.department === department),
    [department, users]
  );
  const selectedMembers = useMemo(
    () => teamMembers.filter((member) => assigneeIds.includes(member.id)),
    [assigneeIds, teamMembers]
  );
  const distributionMembers = assignmentMode === 'ROUND_ROBIN' ? teamMembers : selectedMembers;
  const distribution = useMemo(() => {
    if (!distributionMembers.length) return [];
    return distributionMembers.map((member, index) => ({
      member,
      count: Math.floor(leads.length / distributionMembers.length) + (index < leads.length % distributionMembers.length ? 1 : 0),
    }));
  }, [distributionMembers, leads.length]);

  useEffect(() => {
    setAssigneeIds([]);
  }, [department]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setSuccess('');
    setFileName(file.name);

    const parsed = await readLeadRows(file);
    setLeads(parsed);
    if (!parsed.length) setError('No lead rows found. Include columns like name, phone, email, company, source.');
  };

  const toggleAssignee = (id: string) => {
    setAssigneeIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const submit = () => {
    setError('');
    setSuccess('');
    if (!leads.length) {
      setError('Upload a CSV file with at least one lead.');
      return;
    }
    if (!teamMembers.length) {
      setError(`Add at least one ${department} employee before importing leads.`);
      return;
    }
    if (assignmentMode === 'MANUAL' && !assigneeIds.length) {
      setError('Select at least one team member for manual round robin.');
      return;
    }

    createLeadTasks.mutate({
      assignmentMode,
      department,
      assigneeIds: assignmentMode === 'MANUAL' ? assigneeIds : undefined,
      priority,
      dueDate: dueDate || undefined,
      leads,
    }, {
      onSuccess: (response) => {
        const created = response.data.data?.created || leads.length;
        setSuccess(`${created} task${created === 1 ? '' : 's'} assigned successfully to ${department}.`);
      },
      onError: (err) => {
        const message = isAxiosError(err)
          ? err.response?.data?.error || err.response?.data?.message || err.message
          : 'Tasks could not be assigned.';
        setError(message);
      },
    });
  };

  return (
    <>
      <TopBar title="Import Leads" />
      <div className="page animate-fade-in">
        <button className="btn btn-ghost btn-sm task-detail-back" onClick={() => navigate('/tasks')}>
          <ArrowLeft size={15} /> Back to Tasks
        </button>

        <div className="task-edit-shell">
          <div className="card task-edit-header">
            <div>
              <p className="task-edit-eyebrow">Bulk task creation</p>
              <h2 className="task-detail-title">Upload lead CSV</h2>
            </div>
            <button className="btn btn-primary btn-sm" onClick={submit} disabled={createLeadTasks.isPending || !leads.length}>
              <Upload size={14} /> Create Tasks
            </button>
          </div>

          {error && <div className="card task-import-error">{error}</div>}
          {success && (
            <div className="card task-import-success">
              <span>{success}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tasks')}>View Tasks</button>
            </div>
          )}

          <div className="task-edit-grid">
            <section className="card task-detail-card">
              <h3 className="task-detail-section-title">CSV File</h3>
              <label className="task-import-drop">
                <FileUp size={22} />
                <span>{fileName || 'Choose CSV file'}</span>
                <input type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files?.[0])} />
              </label>
              <p className="task-import-hint">Supports CSV. Recognized columns include Name, Email, Mobile, Project Name, Type of Lead, Message Details, Status, and Budget.</p>
            </section>

            <aside className="card task-detail-card">
              <h3 className="task-detail-section-title">Assignment</h3>
              <div className="form-group">
                <label className="form-label">Department</label>
                <div className="chip-row task-edit-chip-row">
                  {(['Sales', 'HR', 'IT', 'Administration', 'Finance', 'Engineering', 'Marketing', 'Support'] as Department[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`chip ${department === item ? 'active' : ''}`}
                      onClick={() => setDepartment(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="chip-row task-edit-chip-row">
                <button type="button" className={`chip ${assignmentMode === 'ROUND_ROBIN' ? 'active' : ''}`} onClick={() => setAssignmentMode('ROUND_ROBIN')}>All {department}</button>
                <button type="button" className={`chip ${assignmentMode === 'MANUAL' ? 'active' : ''}`} onClick={() => setAssignmentMode('MANUAL')}>Choose {department}</button>
              </div>
              {assignmentMode === 'MANUAL' && (
                <div className="form-group">
                  <label className="form-label">Team Members</label>
                  <div className="chip-row task-edit-chip-row">
                    {teamMembers.length ? teamMembers.map((member) => (
                      <button key={member.id} type="button" className={`chip ${assigneeIds.includes(member.id) ? 'active' : ''}`}
                        onClick={() => toggleAssignee(member.id)}>{member.name}</button>
                    )) : <span className="task-import-hint">No {department} employees found.</span>}
                  </div>
                </div>
              )}
              <div className="task-import-distribution">
                {distribution.length ? distribution.map(({ member, count }) => (
                  <div key={member.id} className="task-import-distribution-row">
                    <span>{member.name}</span>
                    <strong>{count}</strong>
                  </div>
                )) : (
                  <span className="task-import-hint">Select users to preview equal distribution.</span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <div className="chip-row task-edit-chip-row">
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((item) => (
                    <button key={item} type="button" className={`chip ${priority === item ? 'active' : ''}`} onClick={() => setPriority(item)}>{item}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
            </aside>
          </div>

          <div className="card task-detail-card">
            <div className="section-header">
              <h3 className="task-detail-section-title" style={{ marginBottom: 0 }}>Preview</h3>
              <span className="task-comments-sub">{leads.length} lead{leads.length === 1 ? '' : 's'}</span>
            </div>
            <div className="task-import-preview">
              {leads.length ? leads.slice(0, 50).map((lead, index) => (
                <div className="task-import-row" key={`${lead.customerEmail || lead.customerPhone || index}-${index}`}>
                  <div>
                    <strong>{lead.customerName || lead.customerCompany || 'Unnamed lead'}</strong>
                    <span>{[lead.customerPhone, lead.customerEmail, lead.customerCompany, lead.customerSource].filter(Boolean).join(' · ') || 'No contact details'}</span>
                  </div>
                  {distributionMembers.length > 0 && (
                    <span className="task-import-assignee">
                      {distributionMembers[index % distributionMembers.length].name}
                    </span>
                  )}
                </div>
              )) : (
                <div className="task-comments-empty">Upload a CSV file to preview lead rows.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
