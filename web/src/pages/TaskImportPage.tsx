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
  customerPhone: ['phone', 'mobile', 'contact', 'contact number', 'phone number', 'mobile number', 'contactno', 'contact no'],
  customerEmail: ['email', 'email address', 'emailid', 'email id'],
  customerCompany: ['company', 'organization', 'business'],
  customerSource: ['source', 'lead source', 'type of lead', 'contacted by', 'responsetype', 'response type', 'prodtype', 'prod type'],
  projectName: ['project name', 'project', 'project listing'],
  description: ['description', 'notes', 'details', 'message details', 'brief desc.', 'brief desc', 'subject', 'query', 'questionnaire'],
  remarks: ['comment', 'remarks', 'remark', 'status', 'any other details', 'plan to buy', 'budget', 'followupcurrentstatus', 'followup current status', 'receiveddate', 'received date', 'calledon', 'called on', 'leadscore', 'lead score'],
  assignedTo: ['assignee id'],
};
const TEAM_ROLES = ['MEMBER', 'CONTRIBUTOR', 'SALES_TEAM', 'HR_TEAM'] as const;

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const isValidEmail = (value?: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s-]{8,}$/;
const datePattern = /^[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}/;

const readLeadRows = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(buffer);
  const csvLeads = mapLeadRows(parseCsv(text));
  if (csvLeads.length) return csvLeads;
  return mapLeadRowsFromExcelExport(extractBinaryStrings(buffer));
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
  const usableRows = rows.filter((row) => row.some((cell) => cell.trim()));
  const headerIndex = usableRows.findIndex((row) => row.some((cell) =>
    ['name', 'email', 'emailid', 'mobile', 'contactno', 'phone', 'project name', 'interestedin'].includes(normalizeHeader(cell))
  ));
  const headers = headerIndex >= 0 ? usableRows[headerIndex] : usableRows[0] || [];
  const body = headerIndex >= 0 ? usableRows.slice(headerIndex + 1) : usableRows.slice(1);
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
    Boolean(lead.customerName || lead.customerPhone || lead.customerEmail || lead.customerCompany || lead.projectName)
  );
};

const extractBinaryStrings = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const strings: string[] = [];
  let current = '';

  const pushCurrent = () => {
    const cleaned = current.replace(/[\u0000-\u001f]+/g, ' ').trim();
    if (cleaned.length >= 3) strings.push(cleaned);
    current = '';
  };

  for (const byte of bytes) {
    if (byte >= 32 && byte <= 126) {
      current += String.fromCharCode(byte);
    } else {
      pushCurrent();
    }
  }
  pushCurrent();

  return strings
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
};

const isLikelyName = (value?: string) => {
  if (!value) return false;
  if (emailPattern.test(value) || phonePattern.test(value) || datePattern.test(value)) return false;
  if (/verified|lead|hyderabad|andhra|telangana|individual|project|property|status|mobile|email/i.test(value)) return false;
  return /^[A-Za-z][A-Za-z .'-]{1,60}$/.test(value);
};

const extractProjectFromMessage = (value?: string) => {
  if (!value) return undefined;
  const match = value.match(/^(.+?),\s*Hyderabad\s*-/i);
  return match?.[1]?.trim();
};

const getProjectNamesFromExcelExport = (values: string[]) => {
  const projects = new Set<string>();

  values.forEach((value) => {
    const projectFromMessage = extractProjectFromMessage(value);
    if (projectFromMessage) projects.add(projectFromMessage);
  });

  return projects;
};

const mapLeadRowsFromExcelExport = (values: string[]): LeadTaskInput[] => {
  const leads = new Map<string, LeadTaskInput>();
  const projectNames = getProjectNamesFromExcelExport(values);
  let currentProject: string | undefined;

  values.forEach((value, index) => {
    const projectFromValue = extractProjectFromMessage(value);
    if (projectFromValue) currentProject = projectFromValue;
    if (projectNames.has(value)) currentProject = value;

    if (!emailPattern.test(value)) return;

    const beforeRaw = values.slice(Math.max(0, index - 5), index);
    const before = beforeRaw.slice().reverse();
    const after = values.slice(index + 1, Math.min(values.length, index + 14));
    const phone = after.find((item) => phonePattern.test(item));
    const description = after.find((item) => /interested|looking|viewed your contact|requirement/i.test(item));
    const immediateBefore = beforeRaw[beforeRaw.length - 1];
    const previousBefore = beforeRaw[beforeRaw.length - 2];
    const hasProjectBeforeEmail = isLikelyName(previousBefore) && projectNames.has(immediateBefore);
    const name = hasProjectBeforeEmail ? previousBefore : before.find(isLikelyName);
    const project = hasProjectBeforeEmail
      ? immediateBefore
      : extractProjectFromMessage(description) || before.find((item) => projectNames.has(item) && item !== name) || currentProject;
    const messageDate = after.find((item) => datePattern.test(item));
    const source = after.find((item) => /domestic lead|nri lead|lead/i.test(item));
    const remarks = [messageDate, after.find((item) => /not interested|different requirement|not looking/i.test(item))]
      .filter(Boolean)
      .join(' | ');

    leads.set(value.toLowerCase(), {
      customerName: name,
      customerEmail: value,
      customerPhone: phone,
      projectName: project,
      customerSource: source || 'MagicBricks',
      description,
      remarks,
    });
  });

  return Array.from(leads.values()).filter((lead) =>
    Boolean(lead.customerName || lead.customerPhone || lead.customerEmail || lead.customerCompany || lead.projectName)
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
        const skipped = response.data.data?.skipped || 0;
        setSuccess(`${created} task${created === 1 ? '' : 's'} assigned successfully to ${department}${skipped ? `, ${skipped} duplicate ${skipped === 1 ? 'lead was' : 'leads were'} skipped` : ''}.`);
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
                    <span>{[lead.customerPhone, lead.customerEmail, lead.projectName || lead.customerCompany, lead.customerSource].filter(Boolean).join(' · ') || 'No contact details'}</span>
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
