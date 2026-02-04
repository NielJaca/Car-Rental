import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, apiUrl, getImageUrl, getCarImages } from '../../api';
import { confirm, showError } from '../../lib/swal';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60'%3E%3Crect fill='%23e5e7eb' width='80' height='60'/%3E%3C/svg%3E";

function uploadCarImages(carId, files) {
  if (!files || !files.length) return Promise.resolve();
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) formData.append('images', files[i]);
  return fetch(apiUrl(`/cars/${carId}/upload-many`), {
    method: 'POST',
    credentials: 'include',
    body: formData,
  }).then((res) => {
    if (!res.ok) return res.json().then((data) => { throw new Error(data.error || res.statusText); });
    return res.json();
  });
}

export default function AdminCars() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, id: '', name: '', description: '', pricePerDay: '', imageFiles: [], existingImages: [], imagesToRemove: [] });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    apiGet('/cars')
      .then(setCars)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const openAdd = () => setModal({ open: true, id: '', name: '', description: '', pricePerDay: '', imageFiles: [], existingImages: [], imagesToRemove: [] });
  const openEdit = (car) => setModal({
    open: true,
    id: car._id,
    name: car.name,
    description: car.description || '',
    pricePerDay: car.pricePerDay,
    imageFiles: [],
    existingImages: getCarImages(car),
    imagesToRemove: [],
  });
  const close = () => setModal((m) => ({ ...m, open: false, imageFiles: [], imagesToRemove: [] }));

  const removeImageInModal = (url) => {
    confirm({
      title: 'Remove image?',
      text: 'Remove this image from the car? You can add new images before saving.',
      icon: 'question',
    }).then((ok) => {
      if (ok) setModal((m) => ({ ...m, imagesToRemove: m.imagesToRemove.includes(url) ? m.imagesToRemove : [...m.imagesToRemove, url] }));
    });
  };
  const undoRemoveImage = (url) => {
    setModal((m) => ({ ...m, imagesToRemove: m.imagesToRemove.filter((u) => u !== url) }));
  };

  const save = async (e) => {
    e.preventDefault();
    const { id, name, description, pricePerDay, imageFiles, imagesToRemove } = modal;
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      showError('Please enter the car name.');
      return;
    }
    const price = Number(pricePerDay);
    if (pricePerDay === '' || Number.isNaN(price)) {
      showError('Please enter a valid price per day.');
      return;
    }
    if (price < 0) {
      showError('Price per day cannot be negative.');
      return;
    }
    if (price === 0) {
      showError('Please enter a price greater than 0.');
      return;
    }
    setUploading(true);
    try {
      let carId = id;
      if (!id) {
        const created = await apiPost('/cars', { name: trimmedName, description, pricePerDay: price });
        carId = created._id;
      } else {
        await apiPut(`/cars/${id}`, { name: trimmedName, description, pricePerDay: price });
        for (const url of imagesToRemove || []) {
          await apiDelete(`/cars/${carId}/images`, { url });
        }
      }
      if (imageFiles && imageFiles.length) {
        await uploadCarImages(carId, imageFiles);
      }
      close();
      load();
    } catch (err) {
      showError(err.message || 'Save failed');
    } finally {
      setUploading(false);
    }
  };

  const remove = (id) => {
    confirm({
      title: 'Delete car?',
      text: 'Permanently delete this car? All its images and availability data will be removed. This cannot be undone.',
      icon: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    }).then((ok) => {
      if (!ok) return;
      apiDelete(`/cars/${id}`).then(() => load()).catch((err) => showError(err.message));
    });
  };

  if (loading) {
    return (
      <div className="loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Spinner size="lg" />
        <span>Loading cars...</span>
      </div>
    );
  }
  if (error) return <p className="error">{error}</p>;

  return (
    <>
      <h1>Car Management</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>Add, edit, or remove cars. Set name, description, price per day, and upload one or more images.</p>
      <button type="button" className="btn btn-primary" onClick={openAdd}>+ Add Car</button>

      {cars.length === 0 ? (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <EmptyState icon="🚗" title="No cars yet" description="Add your first car to get started." action={<button type="button" className="btn btn-primary" onClick={openAdd}>Add Car</button>} />
        </div>
      ) : (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {cars.map((car) => {
            const images = getCarImages(car);
            const firstImg = images[0];
            return (
            <div key={car._id} className="card card-body" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <img src={getImageUrl(firstImg) || PLACEHOLDER} alt="" style={{ width: 88, height: 66, objectFit: 'cover', borderRadius: 'var(--radius)' }} onError={(e) => { e.target.src = PLACEHOLDER; }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '1.0625rem' }}>{car.name}</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--gray-500)' }}>₱{Number(car.pricePerDay).toLocaleString()} / day</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <label className="btn btn-secondary btn-sm" style={{ margin: 0, cursor: 'pointer' }}>
                  Add images
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files?.length) uploadCarImages(car._id, Array.from(files)).then(() => load()).catch((err) => showError(err.message));
                      e.target.value = '';
                    }}
                  />
                </label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(car)}>Edit</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(car._id)}>Delete</button>
              </div>
            </div>
          ); })}
        </div>
      )}

      {modal.open && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="card card-body" style={{ maxWidth: 480, width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{modal.id ? 'Edit Car' : 'Add Car'}</h2>
            <form onSubmit={save}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" className="form-control" value={modal.name} onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows={3} value={modal.description} onChange={(e) => setModal((m) => ({ ...m, description: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label>Price per day (₱)</label>
                <input type="number" className="form-control" min={0} step={0.01} value={modal.pricePerDay} onChange={(e) => setModal((m) => ({ ...m, pricePerDay: e.target.value }))} required />
              </div>
              {modal.id && modal.existingImages?.length > 0 && (
                <div className="form-group">
                  <label>Current images</label>
                  <div className="admin-car-images-edit">
                    {modal.existingImages.map((url) => {
                      const isRemoved = modal.imagesToRemove?.includes(url);
                      return (
                        <div key={url} className={`admin-car-image-thumb ${isRemoved ? 'removed' : ''}`}>
                          <img src={getImageUrl(url)} alt="" onError={(e) => { e.target.src = PLACEHOLDER; }} />
                          {isRemoved ? (
                            <button type="button" className="btn btn-sm" onClick={() => undoRemoveImage(url)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>Undo</button>
                          ) : (
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeImageInModal(url)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>Remove</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>{modal.id ? 'Add more images (optional)' : 'Upload images (optional, multiple)'}</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="form-control"
                  onChange={(e) => setModal((m) => ({ ...m, imageFiles: Array.from(e.target.files || []) }))}
                />
                <small style={{ color: 'var(--gray-500)', fontSize: '0.8125rem' }}>JPG, PNG, WebP or GIF. Max 5MB each. Select multiple to add several images.</small>
                {modal.imageFiles?.length > 0 && (
                  <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                    {modal.imageFiles.length} new file(s) selected
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? 'Saving...' : 'Save'}</button>
                <button type="button" className="btn btn-secondary" onClick={close} disabled={uploading}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
