import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AssetService, type CreateAssetDto } from '../../core/services/asset.service';
import type { Asset, AssetCategory } from '../../core/models/asset.models';

const CATEGORIES: AssetCategory[] = [
  'SOFA', 'CHAIR', 'TABLE', 'BED', 'STORAGE',
  'LIGHTING', 'DECOR', 'WALL', 'FLOOR', 'CEILING', 'ROOM', 'OTHER',
];

interface AssetForm {
  name: string;
  category: AssetCategory;
  glbUrl: string;
  thumbnailUrl: string;
  tags: string;
  isPublic: boolean;
}

function emptyForm(): AssetForm {
  return { name: '', category: 'OTHER', glbUrl: '', thumbnailUrl: '', tags: '', isPublic: true };
}

@Component({
  selector: 'app-admin-assets',
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display: flex; height: 100vh; background: #F8FAFF; overflow: hidden; }

    .sidebar {
      position: fixed; left: 0; top: 0; bottom: 0; width: 56px;
      background: white; border-right: 1px solid rgba(0,0,0,0.06);
      box-shadow: 4px 0 24px rgba(0,0,0,0.04);
      transition: width 300ms cubic-bezier(0.4,0,0.2,1);
      overflow: hidden; display: flex; flex-direction: column; z-index: 40;
    }
    .sidebar:hover { width: 220px; }

    .nav-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 16px;
      border-radius: 12px; margin: 2px 8px; cursor: pointer; transition: background 200ms;
      white-space: nowrap; color: #6E6E73; font-size: 14px;
      border: none; background: transparent; text-align: left; width: calc(100% - 16px);
    }
    .nav-item:hover { background: #F5F7FF; color: #1D1D1F; }
    .nav-item.active { background: #EFF6FF; color: #2563EB; font-weight: 600; }
    .nav-item .icon { font-size: 18px; flex-shrink: 0; width: 24px; text-align: center; }

    .main { margin-left: 56px; flex: 1; overflow-y: auto; padding: 32px; }

    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
    .page-title { font-size: 22px; font-weight: 700; color: #1D1D1F; }
    .page-sub { font-size: 13px; color: #6B7280; margin-top: 2px; }

    .toolbar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
    .search-input { flex: 1; min-width: 200px; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 9px 14px; font-size: 14px; color: #1D1D1F; outline: none; transition: border-color 200ms; background: white; }
    .search-input:focus { border-color: #2563EB; }
    .filter-select { border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 9px 14px; font-size: 14px; color: #1D1D1F; outline: none; background: white; cursor: pointer; }
    .btn-primary { padding: 9px 20px; border: none; border-radius: 10px; background: #2563EB; color: white; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 150ms; white-space: nowrap; }
    .btn-primary:hover { background: #1D4ED8; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .stats-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat-card { background: white; border-radius: 14px; border: 1px solid rgba(0,0,0,0.06); padding: 16px 20px; min-width: 110px; }
    .stat-val { font-size: 24px; font-weight: 700; color: #1D1D1F; }
    .stat-lbl { font-size: 12px; color: #6B7280; margin-top: 2px; }

    table { width: 100%; border-collapse: collapse; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    thead tr { background: #F9FAFB; }
    th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #6B7280; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid #F3F4F6; }
    td { padding: 14px 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #F9FAFB; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #FAFBFF; }

    .badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-blue { background: #EFF6FF; color: #2563EB; }
    .badge-green { background: #ECFDF5; color: #059669; }
    .badge-gray { background: #F3F4F6; color: #6B7280; }

    .thumb { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 18px; overflow: hidden; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }

    .action-btn { padding: 5px 12px; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 150ms; border: none; }
    .edit-btn { background: #EFF6FF; color: #2563EB; }
    .edit-btn:hover { background: #DBEAFE; }
    .del-btn { background: #FEF2F2; color: #DC2626; margin-left: 6px; }
    .del-btn:hover { background: #FEE2E2; }

    .empty-state { text-align: center; padding: 60px 0; color: #9CA3AF; }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-card { background: white; border-radius: 20px; padding: 28px 32px; width: 100%; max-width: 520px; box-shadow: 0 32px 80px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto; }
    .modal-title { font-size: 18px; font-weight: 700; color: #1D1D1F; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
    .modal-close { background: none; border: none; font-size: 20px; color: #9CA3AF; cursor: pointer; }
    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .form-input, .form-select { width: 100%; box-sizing: border-box; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 9px 14px; font-size: 14px; color: #1D1D1F; outline: none; transition: border-color 200ms; }
    .form-input:focus, .form-select:focus { border-color: #2563EB; }
    .form-toggle { display: flex; align-items: center; gap: 10px; }
    .form-toggle input[type=checkbox] { width: 18px; height: 18px; cursor: pointer; accent-color: #2563EB; }
    .modal-actions { display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end; }
    .btn-cancel { padding: 9px 20px; border: 1px solid #E5E7EB; border-radius: 10px; background: white; color: #6B7280; font-size: 14px; font-weight: 500; cursor: pointer; }
    .btn-cancel:hover { background: #F9FAFB; }

    .error-msg { color: #DC2626; font-size: 13px; margin-top: 4px; }
    .loading-row td { color: #9CA3AF; }

    .del-confirm { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; }
    .del-confirm p { font-size: 14px; color: #374151; margin: 0; }
    .del-confirm strong { color: #DC2626; }
  `],
  template: `
    <!-- Add / Edit Modal -->
    @if (showModal()) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-title">
            <span>{{ editId() ? 'Edit Asset' : 'Add New Asset' }}</span>
            <button class="modal-close" (click)="closeModal()">✕</button>
          </div>

          <div class="form-group">
            <label class="form-label">Name *</label>
            <input class="form-input" [(ngModel)]="form.name" placeholder="e.g. Modern Sofa 3-Seater" />
          </div>

          <div class="form-group">
            <label class="form-label">Category *</label>
            <select class="form-select" [(ngModel)]="form.category">
              @for (cat of categories; track cat) {
                <option [value]="cat">{{ cat }}</option>
              }
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">GLB Model URL *</label>
            <input class="form-input" [(ngModel)]="form.glbUrl" placeholder="https://example.com/model.glb" />
          </div>

          <div class="form-group">
            <label class="form-label">Thumbnail URL</label>
            <input class="form-input" [(ngModel)]="form.thumbnailUrl" placeholder="https://example.com/thumb.png" />
          </div>

          <div class="form-group">
            <label class="form-label">Tags (comma-separated)</label>
            <input class="form-input" [(ngModel)]="form.tags" placeholder="modern, nordic, wooden" />
          </div>

          <div class="form-group">
            <div class="form-toggle">
              <input type="checkbox" id="isPublic" [(ngModel)]="form.isPublic" />
              <label for="isPublic" class="form-label" style="margin:0; cursor:pointer">Publicly visible</label>
            </div>
          </div>

          @if (modalError()) {
            <div class="error-msg">{{ modalError() }}</div>
          }

          <div class="modal-actions">
            <button class="btn-cancel" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" [disabled]="saving()" (click)="saveAsset()">
              {{ saving() ? 'Saving…' : (editId() ? 'Save Changes' : 'Create Asset') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete Confirm Modal -->
    @if (deleteTarget()) {
      <div class="modal-backdrop" (click)="deleteTarget.set(null)">
        <div class="modal-card" style="max-width:400px" (click)="$event.stopPropagation()">
          <div class="modal-title">
            <span>Delete Asset</span>
            <button class="modal-close" (click)="deleteTarget.set(null)">✕</button>
          </div>
          <div class="del-confirm">
            <p>Are you sure you want to delete <strong>{{ deleteTarget()!.name }}</strong>? This cannot be undone.</p>
          </div>
          @if (modalError()) { <div class="error-msg">{{ modalError() }}</div> }
          <div class="modal-actions">
            <button class="btn-cancel" (click)="deleteTarget.set(null)">Cancel</button>
            <button class="btn-primary" style="background:#DC2626" [disabled]="saving()" (click)="confirmDelete()">
              {{ saving() ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Sidebar -->
    <nav class="sidebar">
      <div class="flex items-center gap-3 px-4 py-5 border-b border-gray-100 mb-2" style="min-height:64px">
        <div class="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <span class="text-white text-sm font-bold">D</span>
        </div>
        <span class="text-base font-bold text-gray-900 whitespace-nowrap">DITO Admin</span>
      </div>
      <div class="flex-1 py-2 overflow-hidden">
        <button class="nav-item" (click)="router.navigate(['/dashboard'])">
          <span class="icon">🏠</span>
          <span>Dashboard</span>
        </button>
        <div class="h-px bg-gray-100 mx-4 my-2"></div>
        <button class="nav-item active">
          <span class="icon">📦</span>
          <span>Asset Management</span>
        </button>
      </div>
      <div class="border-t border-gray-100 py-3">
        <div class="flex items-center gap-3 px-4 py-2 whitespace-nowrap overflow-hidden">
          <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <span class="text-red-600 text-xs font-bold">A</span>
          </div>
          <span class="text-sm text-gray-700 truncate font-medium">{{ auth.user()?.name }}</span>
        </div>
        <button class="nav-item" (click)="auth.logout()">
          <span class="icon" style="font-size:16px">→</span>
          <span>Sign out</span>
        </button>
      </div>
    </nav>

    <!-- Main content -->
    <div class="main">
      <div class="page-header">
        <div>
          <div class="page-title">Asset Management</div>
          <div class="page-sub">Manage 3D models and assets in the library</div>
        </div>
        <button class="btn-primary" (click)="openAddModal()">+ Add Asset</button>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-val">{{ totalCount() }}</div>
          <div class="stat-lbl">Total Assets</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ assets().filter(a => a.isPublic).length }}</div>
          <div class="stat-lbl">Public</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ assets().filter(a => !a.isPublic).length }}</div>
          <div class="stat-lbl">Private</div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <input class="search-input" type="text" placeholder="Search assets…"
          [(ngModel)]="searchQuery" (ngModelChange)="onSearch()" />
        <select class="filter-select" [(ngModel)]="filterCategory" (ngModelChange)="onFilter()">
          <option value="">All Categories</option>
          @for (cat of categories; track cat) {
            <option [value]="cat">{{ cat }}</option>
          }
        </select>
      </div>

      <!-- Table -->
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Category</th>
            <th>Tags</th>
            <th>Visibility</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            <tr class="loading-row"><td colspan="6" style="text-align:center;padding:40px">Loading assets…</td></tr>
          } @else if (assets().length === 0) {
            <tr><td colspan="6">
              <div class="empty-state">
                <div style="font-size:40px;margin-bottom:12px">📦</div>
                <div style="font-weight:600;color:#374151">No assets found</div>
                <div style="font-size:13px;margin-top:4px">Add your first 3D asset to the library</div>
              </div>
            </td></tr>
          } @else {
            @for (asset of assets(); track asset.id) {
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:12px">
                    <div class="thumb">
                      @if (asset.thumbnailUrl) {
                        <img [src]="asset.thumbnailUrl" [alt]="asset.name" />
                      } @else {
                        🧊
                      }
                    </div>
                    <div>
                      <div style="font-weight:600;color:#111827">{{ asset.name }}</div>
                      <div style="font-size:11px;color:#9CA3AF;margin-top:2px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ asset.glbUrl }}</div>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-blue">{{ asset.category }}</span></td>
                <td>
                  <div style="display:flex;flex-wrap:wrap;gap:4px">
                    @for (tag of asset.tags.slice(0,3); track tag) {
                      <span class="badge badge-gray">{{ tag }}</span>
                    }
                    @if (asset.tags.length > 3) {
                      <span class="badge badge-gray">+{{ asset.tags.length - 3 }}</span>
                    }
                  </div>
                </td>
                <td>
                  <span class="badge" [class.badge-green]="asset.isPublic" [class.badge-gray]="!asset.isPublic">
                    {{ asset.isPublic ? 'Public' : 'Private' }}
                  </span>
                </td>
                <td style="color:#6B7280;font-size:12px">{{ asset.createdAt | date:'dd MMM yyyy' }}</td>
                <td>
                  <button class="action-btn edit-btn" (click)="openEditModal(asset)">Edit</button>
                  <button class="action-btn del-btn" (click)="deleteTarget.set(asset)">Delete</button>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>

      <!-- Pagination -->
      @if (totalCount() > pageSize) {
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:20px">
          <span style="font-size:13px;color:#6B7280">Showing {{ (page()-1)*pageSize+1 }}–{{ [page()*pageSize, totalCount()].at(-1) !== undefined ? Math.min(page()*pageSize, totalCount()) : 0 }} of {{ totalCount() }}</span>
          <div style="display:flex;gap:8px">
            <button class="action-btn edit-btn" [disabled]="page()===1" (click)="goPage(-1)">← Prev</button>
            <span style="padding:5px 12px;font-size:13px">{{ page() }}</span>
            <button class="action-btn edit-btn" [disabled]="page()*pageSize>=totalCount()" (click)="goPage(1)">Next →</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminAssetsComponent implements OnInit {
  readonly auth    = inject(AuthService);
  readonly assetSvc = inject(AssetService);
  readonly router  = inject(Router);

  readonly categories = CATEGORIES;
  readonly Math = Math;
  readonly pageSize = 20;

  assets     = signal<Asset[]>([]);
  totalCount = signal(0);
  loading    = signal(true);
  page       = signal(1);

  searchQuery    = '';
  filterCategory = '';

  showModal  = signal(false);
  editId     = signal<string | null>(null);
  saving     = signal(false);
  modalError = signal('');
  form: AssetForm = emptyForm();

  deleteTarget = signal<Asset | null>(null);

  ngOnInit() { this.load(); }

  private load() {
    this.loading.set(true);
    const params: Record<string, string | number> = { page: this.page(), limit: this.pageSize };
    if (this.searchQuery.trim()) params['search'] = this.searchQuery.trim();
    if (this.filterCategory) params['category'] = this.filterCategory;

    this.assetSvc.list(params as any).subscribe({
      next: res => {
        this.assets.set(res.data ?? []);
        this.totalCount.set(res.meta?.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch()  { this.page.set(1); this.load(); }
  onFilter()  { this.page.set(1); this.load(); }
  goPage(dir: 1 | -1) { this.page.update(p => p + dir); this.load(); }

  openAddModal() {
    this.editId.set(null);
    this.form = emptyForm();
    this.modalError.set('');
    this.showModal.set(true);
  }

  openEditModal(asset: Asset) {
    this.editId.set(asset.id);
    this.form = {
      name: asset.name,
      category: asset.category,
      glbUrl: asset.glbUrl,
      thumbnailUrl: asset.thumbnailUrl ?? '',
      tags: asset.tags.join(', '),
      isPublic: asset.isPublic,
    };
    this.modalError.set('');
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.deleteTarget.set(null);
    this.modalError.set('');
  }

  saveAsset() {
    const { name, category, glbUrl, thumbnailUrl, tags, isPublic } = this.form;
    if (!name.trim()) { this.modalError.set('Name is required.'); return; }
    if (!glbUrl.trim()) { this.modalError.set('GLB URL is required.'); return; }

    const dto: CreateAssetDto = {
      name: name.trim(),
      category,
      glbUrl: glbUrl.trim(),
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      isPublic,
    };

    this.saving.set(true);
    this.modalError.set('');

    const id = this.editId();
    const op$ = id ? this.assetSvc.update(id, dto) : this.assetSvc.create(dto);

    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.load();
      },
      error: (err: any) => {
        this.saving.set(false);
        this.modalError.set(err?.error?.message ?? 'Something went wrong.');
      },
    });
  }

  confirmDelete() {
    const target = this.deleteTarget();
    if (!target) return;
    this.saving.set(true);
    this.modalError.set('');
    this.assetSvc.remove(target.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.deleteTarget.set(null);
        this.load();
      },
      error: (err: any) => {
        this.saving.set(false);
        this.modalError.set(err?.error?.message ?? 'Delete failed.');
      },
    });
  }
}
