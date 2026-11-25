import { useState } from 'react';
import { Eye, Mail, Pencil, Phone, Search, Stethoscope, Trash2 } from 'lucide-react';
import { useResource } from '../hooks';
import { api } from '../api';
import {
  AddButton,
  Badge,
  Button,
  ConfirmDelete,
  Empty,
  Loading,
  Modal,
  Notice,
  PageHeading,
} from '../components/ui';
import DoctorForm, { Availability } from '../components/DoctorForm';
export default function Doctors() {
  const { data, loading, error, refresh } = useResource('/doctors');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [success, setSuccess] = useState('');
  const filtered = (data || []).filter((doctor) =>
    `${doctor.name} ${doctor.specialization}`.toLowerCase().includes(search.toLowerCase()),
  );
  function saved(message) {
    setForm(null);
    setSuccess(message);
    refresh();
  }
  async function remove() {
    setBusy(true);
    setDeleteError('');
    try {
      await api(`/doctors/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      setSuccess('Doctor deleted.');
      refresh();
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR CARE TEAM"
        title="Doctors"
        description="Good care starts with a great team. Manage yours here."
        action={<AddButton onClick={() => setForm({})}>Add doctor</AddButton>}
      />
      <Notice type="success" message={success} onClose={() => setSuccess('')} />
      <section className="panel">
        <div className="list-toolbar">
          <div>
            <h2>
              All doctors <span className="count">{data?.length || 0}</span>
            </h2>
            <p className="muted">People behind your patients’ smiles.</p>
          </div>
          <label className="search-input">
            <Search size={18} />
            <input
              type="search"
              aria-label="Search doctors"
              placeholder="Search name or specialization…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        {error ? (
          <div className="panel-body">
            <Notice message={error} />
            <Button variant="secondary" onClick={refresh}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <Loading />
        ) : !filtered.length ? (
          <Empty
            title={search ? 'No matching doctors' : 'Your care team starts here'}
            description={
              search
                ? 'Try another name or specialization.'
                : 'Add your first doctor to start booking patient visits.'
            }
            action={
              search ? (
                <Button variant="secondary" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              ) : (
                <AddButton onClick={() => setForm({})}>Add doctor</AddButton>
              )
            }
          />
        ) : (
          <div className="doctor-grid">
            {filtered.map((doctor, index) => (
              <article className="doctor-card" key={doctor.id}>
                <div className="doctor-card-top">
                  <span className={`doctor-avatar color-${index % 3}`}>
                    <Stethoscope size={27} />
                  </span>
                  <Badge value={doctor.active ? 'active' : 'inactive'} />
                </div>
                <h3>{doctor.name}</h3>
                <p className="specialization">{doctor.specialization}</p>
                <div className="doctor-contact">
                  {doctor.phone && (
                    <span>
                      <Phone size={15} />
                      {doctor.phone}
                    </span>
                  )}
                  {doctor.email && (
                    <span>
                      <Mail size={15} />
                      {doctor.email}
                    </span>
                  )}
                </div>
                <div className="doctor-availability">
                  <span>Weekly availability</span>
                  <strong>
                    {Object.values(doctor.availability).filter((slots) => slots.length).length} days
                    / week
                  </strong>
                </div>
                <div className="doctor-card-actions">
                  <button className="text-link" onClick={() => setDetail(doctor)}>
                    <Eye size={16} />
                    View details
                  </button>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Edit ${doctor.name}`}
                      onClick={() => setForm(doctor)}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="icon-button delete"
                      aria-label={`Delete ${doctor.name}`}
                      onClick={() => {
                        setDeleteError('');
                        setDeleting(doctor);
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {form && (
        <DoctorForm doctor={form.id ? form : null} onClose={() => setForm(null)} onSaved={saved} />
      )}
      {detail && (
        <Modal title={detail.name} subtitle={detail.specialization} onClose={() => setDetail(null)}>
          <div className="detail-meta">
            <Badge value={detail.active ? 'active' : 'inactive'} />
            <p>
              {detail.phone || 'No phone number'}
              <br />
              {detail.email || 'No email address'}
            </p>
          </div>
          <h3>Weekly availability</h3>
          <Availability availability={detail.availability} />
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setDetail(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setForm(detail);
                setDetail(null);
              }}
            >
              Edit doctor
            </Button>
          </div>
        </Modal>
      )}
      {deleting && (
        <ConfirmDelete
          label={deleting.name}
          busy={busy}
          error={deleteError}
          onClose={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}
