import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SceneService } from '../../core/services/scene.service';
import type { SceneSummary } from '../../core/models/scene.models';

const FEATURES = [
  { title: '3D Design Studio', desc: 'Drag, drop and compose stunning interior spaces', icon: '🎨', gradient: 'from-blue-500 to-blue-700' },
  { title: 'AI Rendering', desc: 'Transform your 3D scenes into photorealistic images', icon: '✨', gradient: 'from-purple-500 to-purple-700' },
  { title: 'Material Library', desc: 'Browse thousands of PBR materials for any surface', icon: '🎭', gradient: 'from-emerald-500 to-emerald-700' },
  { title: 'Smart Snap Engine', desc: 'Metadata-driven placement rules keep furniture perfect', icon: '⚡', gradient: 'from-orange-500 to-orange-600' },
];

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, DatePipe, FormsModule],
  styles: [`
    :host { display: flex; height: 100vh; overflow: hidden; background: #F8FAFF; }

    .sidebar {
      position: fixed; left: 0; top: 0; bottom: 0;
      width: 56px; background: white;
      border-right: 1px solid rgba(0,0,0,0.06);
      box-shadow: 4px 0 24px rgba(0,0,0,0.04);
      transition: width 300ms cubic-bezier(0.4,0,0.2,1);
      overflow: hidden;
      display: flex; flex-direction: column;
      z-index: 40;
    }
    .sidebar:hover { width: 220px; }

    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 16px; border-radius: 12px; margin: 2px 8px;
      cursor: pointer; transition: background 200ms;
      white-space: nowrap; color: #6E6E73; font-size: 14px;
      border: none; background: transparent; text-align: left;
      width: calc(100% - 16px);
    }
    .nav-item:hover { background: #F5F7FF; color: #1D1D1F; }
    .nav-item.active { background: #EFF6FF; color: #2563EB; font-weight: 600; }
    .nav-item .icon { font-size: 18px; flex-shrink: 0; width: 24px; text-align: center; }

    .main-content {
      margin-left: 56px;
      flex: 1; overflow-y: auto; padding: 32px;
      height: 100vh;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-in { animation: fadeInUp 0.4s ease forwards; }

    .feature-card {
      background: white; border-radius: 20px;
      border: 1px solid rgba(0,0,0,0.06);
      padding: 24px; transition: all 300ms;
      animation: fadeInUp 0.5s ease forwards;
    }
    .feature-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
  `],
  template: `
    <!-- Left Sidebar -->
    <nav class="sidebar">
      <!-- Logo -->
      <div class="flex items-center gap-3 px-4 py-5 border-b border-gray-100 mb-2" style="min-height:64px">
        <div class="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <span class="text-white text-sm font-bold">D</span>
        </div>
        <span class="text-base font-bold text-gray-900 whitespace-nowrap">DITO</span>
      </div>

      <!-- Nav items -->
      <div class="flex-1 py-2 overflow-hidden">
        <button class="nav-item" (click)="router.navigate(['/dashboard'])">
          <span class="icon">🏠</span>
          <span>Dashboard</span>
        </button>
        <button class="nav-item active">
          <span class="icon">🎨</span>
          <span>My Designs</span>
        </button>
        <button class="nav-item" (click)="router.navigate(['/settings'])">
          <span class="icon">⚙️</span>
          <span>Account Settings</span>
        </button>

        @if (auth.user()?.role === 'ADMIN') {
          <div class="h-px bg-gray-100 mx-4 my-2"></div>
          <button class="nav-item" (click)="router.navigate(['/admin'])">
            <span class="icon">🛡</span>
            <span>Admin</span>
          </button>
        }
      </div>

      <!-- Bottom: user + sign out -->
      <div class="border-t border-gray-100 py-3">
        <div class="flex items-center gap-3 px-4 py-2 whitespace-nowrap overflow-hidden">
          <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span class="text-blue-600 text-xs font-bold">{{ (auth.user()?.name ?? 'U')[0].toUpperCase() }}</span>
          </div>
          <span class="text-sm text-gray-700 truncate font-medium">{{ auth.user()?.name }}</span>
        </div>
        <button class="nav-item" (click)="auth.logout()">
          <span class="icon" style="font-size:16px">→</span>
          <span>Sign out</span>
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="main-content">

      <!-- Top greeting -->
      <div class="flex items-start justify-between mb-8 animate-in">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ greeting() }}, {{ firstName() }} 👋</h1>
          <p class="text-gray-500 mt-1">Here's your design workspace</p>
        </div>
        <button
          (click)="createScene()"
          [disabled]="creating()"
          class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
        >
          <span class="text-base">+</span>
          {{ creating() ? 'Creating…' : 'New Design' }}
        </button>
      </div>

      <!-- Feature carousel / grid -->
      <section class="mb-10">
        <h2 class="text-base font-semibold text-gray-700 mb-4">Features</h2>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          @for (f of features; track f.title) {
            <div class="feature-card">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br {{ f.gradient }} flex items-center justify-center mb-4">
                <span class="text-xl">{{ f.icon }}</span>
              </div>
              <h3 class="font-semibold text-sm text-gray-900 mb-1">{{ f.title }}</h3>
              <p class="text-xs text-gray-500 leading-relaxed">{{ f.desc }}</p>
            </div>
          }
        </div>
      </section>

      <!-- My Designs section -->
      <section>
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-3">
            <h2 class="text-lg font-semibold text-gray-900">My Designs</h2>
            @if (!loading()) {
              <span class="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">{{ scenes().length }}</span>
            }
          </div>
          <button
            (click)="createScene()"
            [disabled]="creating()"
            class="flex items-center gap-1.5 px-3.5 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-60 transition-colors font-medium"
          >
            <span>+</span> New Design
          </button>
        </div>

        <!-- Skeleton loading -->
        @if (loading()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            @for (i of [1,2,3,4]; track i) {
              <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div class="h-40 bg-gray-100 animate-pulse"></div>
                <div class="p-4 space-y-2">
                  <div class="h-3 bg-gray-100 rounded animate-pulse w-3/4"></div>
                  <div class="h-2.5 bg-gray-100 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
            }
          </div>
        } @else if (scenes().length === 0) {
          <!-- Empty state -->
          <div class="text-center py-24 animate-in">
            <div class="text-6xl mb-4">🛋️</div>
            <p class="text-gray-700 font-semibold text-lg">No designs yet</p>
            <p class="text-gray-400 text-sm mt-1 mb-6">Create your first interior design</p>
            <button
              (click)="createScene()"
              [disabled]="creating()"
              class="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {{ creating() ? 'Creating…' : 'Create Design' }}
            </button>
          </div>
        } @else {
          <!-- Project cards grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            @for (scene of scenes(); track scene.id) {
              <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group relative">
                <!-- Thumbnail area -->
                <div class="h-40 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                  @if (scene.thumbnail) {
                    <img [src]="scene.thumbnail" [alt]="scene.name" class="w-full h-full object-cover" />
                  } @else {
                    <div class="absolute inset-0 flex items-center justify-center">
                      <span class="text-5xl opacity-20 group-hover:opacity-30 transition-opacity">🛋</span>
                    </div>
                  }

                  <!-- 3-dot menu button -->
                  <button
                    class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 text-gray-600 hover:text-gray-900"
                    (click)="toggleMenu($event, scene.id)">
                    ⋯
                  </button>

                  <!-- Dropdown menu -->
                  @if (openMenuId() === scene.id) {
                    <div class="absolute top-10 right-2 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-1 min-w-36">
                      <button (click)="startRename($event, scene)" class="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                        ✏️ Rename
                      </button>
                      <div class="h-px bg-gray-100 mx-2"></div>
                      <button (click)="confirmDelete($event, scene.id)" class="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                        🗑 Delete
                      </button>
                    </div>
                  }

                  <!-- Click overlay -->
                  <div class="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors cursor-pointer"
                    (click)="openScene(scene.id)"></div>
                </div>

                <!-- Card footer -->
                <div class="p-4">
                  @if (renamingId() === scene.id) {
                    <input
                      [(ngModel)]="renameValue"
                      name="rename-{{ scene.id }}"
                      class="w-full text-sm font-medium border-b border-blue-400 outline-none pb-0.5 bg-transparent text-gray-900"
                      (keydown.enter)="submitRename(scene.id)"
                      (keydown.escape)="cancelRename()"
                      (blur)="cancelRename()" />
                  } @else {
                    <p class="font-medium text-sm text-gray-900 truncate cursor-pointer" (click)="openScene(scene.id)">{{ scene.name }}</p>
                  }
                  <div class="flex items-center justify-between mt-2">
                    <span class="text-xs text-gray-400">v{{ scene.version }}</span>
                    <span class="text-xs text-gray-400">{{ scene.updatedAt | date:'MMM d' }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  private readonly sceneService = inject(SceneService);

  readonly scenes = signal<SceneSummary[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly openMenuId = signal<string | null>(null);
  readonly renamingId = signal<string | null>(null);
  renameValue = '';

  readonly features = FEATURES;

  ngOnInit(): void {
    this.loading.set(true);
    this.sceneService.list().subscribe({
      next: res => { this.scenes.set(res.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createScene(): void {
    this.creating.set(true);
    this.sceneService.create('Untitled Design').subscribe({
      next: scene => this.router.navigate(['/studio', scene.id]),
      error: () => this.creating.set(false),
    });
  }

  openScene(id: string): void {
    this.router.navigate(['/studio', id]);
  }

  toggleMenu(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  startRename(event: MouseEvent, scene: SceneSummary): void {
    event.stopPropagation();
    this.openMenuId.set(null);
    this.renameValue = scene.name;
    this.renamingId.set(scene.id);
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(`input[name="rename-${scene.id}"]`);
      input?.focus();
      input?.select();
    }, 50);
  }

  submitRename(id: string): void {
    if (!this.renameValue.trim()) { this.cancelRename(); return; }
    this.sceneService.rename(id, this.renameValue.trim()).subscribe({
      next: () => {
        const trimmed = this.renameValue.trim();
        this.scenes.update(list => list.map(s => s.id === id ? { ...s, name: trimmed } : s));
        this.renamingId.set(null);
      },
      error: () => this.renamingId.set(null),
    });
  }

  cancelRename(): void { this.renamingId.set(null); }

  confirmDelete(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.openMenuId.set(null);
    if (!confirm('Delete this design? This cannot be undone.')) return;
    this.sceneService.delete(id).subscribe({
      next: () => this.scenes.update(list => list.filter(s => s.id !== id)),
    });
  }

  @HostListener('document:click')
  closeMenu(): void { this.openMenuId.set(null); }

  greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  firstName(): string {
    const name = this.auth.user()?.name;
    if (!name) return '';
    return name.split(' ').at(0) ?? name;
  }
}
