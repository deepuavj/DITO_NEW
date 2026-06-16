import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SceneService } from '../../core/services/scene.service';
import type { SceneSummary } from '../../core/models/scene.models';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, DatePipe],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span class="text-white text-sm font-bold">D</span>
          </div>
          <h1 class="text-lg font-bold text-gray-900">DITO</h1>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-600">{{ auth.user()?.name }}</span>
          <button
            (click)="auth.logout()"
            class="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >Sign out</button>
        </div>
      </header>

      <!-- Main -->
      <main class="max-w-7xl mx-auto px-6 py-8">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">My Designs</h2>
            <p class="text-sm text-gray-500 mt-0.5">Your interior design workspace</p>
          </div>
          <button
            (click)="createScene()"
            [disabled]="creating()"
            class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            <span>+</span>
            {{ creating() ? 'Creating…' : 'New Design' }}
          </button>
        </div>

        @if (loading()) {
          <div class="text-center py-16 text-gray-400 text-sm">Loading designs…</div>
        } @else if (scenes().length === 0) {
          <div class="text-center py-20">
            <div class="text-5xl mb-4">🛋</div>
            <p class="text-gray-500 font-medium">No designs yet</p>
            <p class="text-gray-400 text-sm mt-1">Create your first interior design</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            @for (scene of scenes(); track scene.id) {
              <div
                (click)="openScene(scene.id)"
                class="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div class="h-36 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                  @if (scene.thumbnail) {
                    <img [src]="scene.thumbnail" [alt]="scene.name" class="w-full h-full object-cover" />
                  } @else {
                    <span class="text-4xl opacity-20 group-hover:opacity-30 transition-opacity">🛋</span>
                  }
                </div>
                <div class="p-3">
                  <p class="font-medium text-sm text-gray-900 truncate">{{ scene.name }}</p>
                  <div class="flex items-center justify-between mt-1">
                    <p class="text-xs text-gray-400">v{{ scene.version }}</p>
                    <p class="text-xs text-gray-400">{{ scene.updatedAt | date:'mediumDate' }}</p>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </main>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly sceneService = inject(SceneService);
  private readonly router = inject(Router);

  readonly scenes = signal<SceneSummary[]>([]);
  readonly loading = signal(false);
  readonly creating = signal(false);

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
}
