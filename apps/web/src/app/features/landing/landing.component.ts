import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  signal,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- NAV -->
    <nav class="glass nav-bar">
      <div class="nav-inner">
        <a routerLink="/" class="nav-logo">
          <span class="logo-icon">◈</span>
          <span class="logo-text">DITO</span>
        </a>
        <div class="nav-links">
          <a class="nav-link" href="#features">Features</a>
          <a class="nav-link" href="#how">How it works</a>
          <a class="nav-link" href="#showcase">Showcase</a>
          <a class="nav-link" href="#testimonials">Testimonials</a>
        </div>
        <div class="nav-ctas">
          <a routerLink="/auth/login" class="btn-ghost">Sign in</a>
          <a routerLink="/auth/register" class="btn-primary">Get started</a>
        </div>
      </div>
    </nav>

    <!-- HERO -->
    <section class="hero-section">
      <div class="hero-content animate-fade-in-up">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          Introducing AI-Powered Interior Design
        </div>
        <h1 class="hero-heading">
          Design interiors.<br />
          <span class="gradient-text">See them come alive.</span>
        </h1>
        <p class="hero-sub">
          From parametric 3D models to photorealistic AI renders — design, iterate,
          and share stunning interiors in minutes, not weeks.
        </p>
        <div class="hero-actions">
          <a routerLink="/auth/register" class="btn-primary btn-lg">
            Start designing free
            <span class="btn-arrow">→</span>
          </a>
          <a href="#features" class="btn-outline btn-lg">See how it works</a>
        </div>
        <p class="hero-note">No credit card required · Free forever plan</p>
      </div>

      <!-- 3D / Realistic Slider -->
      <div class="hero-slider-wrapper scroll-reveal">
        <div class="hero-wrapper">
          <!-- THREE.JS CANVAS -->
          <canvas #heroCanvas class="hero-canvas"></canvas>

          <!-- REALISTIC OVERLAY -->
          <div
            class="realistic-room"
            [style.clip-path]="'inset(0 ' + (100 - sliderPos()) + '% 0 0)'"
          >
            <!-- Furniture CSS elements -->
            <div class="r-rug"></div>
            <div class="r-sofa"></div>
            <div class="r-table"></div>
            <div class="r-plant"></div>
            <div class="r-lamp-glow"></div>
            <div class="r-art"></div>
            <div class="r-floor-shadow"></div>
          </div>

          <!-- SLIDER DIVIDER -->
          <div class="slider-divider" [style.left.%]="sliderPos()">
            <div class="slider-handle">⇔</div>
          </div>

          <!-- LABELS -->
          <div class="slider-label label-left glass-dark">
            <span class="label-dot dot-blue"></span>3D Design Mode
          </div>
          <div
            class="slider-label label-right glass-white"
            [style.opacity]="sliderPos() > 15 ? 1 : 0"
          >
            ✨ AI Rendered
          </div>
        </div>
      </div>
    </section>

    <!-- STATS BAR -->
    <section class="stats-section">
      <div class="stats-inner">
        <div class="stat-card scroll-reveal" *ngFor="let s of stats">
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section id="features" class="section features-section">
      <div class="section-label">CAPABILITIES</div>
      <h2 class="section-heading scroll-reveal">
        Everything you need to design<br />
        <span class="gradient-text">professional interiors</span>
      </h2>
      <p class="section-sub scroll-reveal">
        DITO brings together real-time 3D, AI rendering, and smart material
        intelligence into one seamless workflow.
      </p>
      <div class="features-grid">
        <div class="neumorphic feature-card scroll-reveal" *ngFor="let f of features">
          <div class="feature-icon" [style.background]="f.iconBg">{{ f.icon }}</div>
          <h3 class="feature-title">{{ f.title }}</h3>
          <p class="feature-desc">{{ f.desc }}</p>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section id="how" class="section how-section">
      <div class="section-label">PROCESS</div>
      <h2 class="section-heading scroll-reveal">
        From concept to render<br />
        <span class="gradient-text">in three steps</span>
      </h2>
      <div class="steps-row">
        <div class="step scroll-reveal" *ngFor="let st of steps; let i = index">
          <div class="step-number">{{ i + 1 }}</div>
          <div class="step-line" *ngIf="i < steps.length - 1"></div>
          <h3 class="step-title">{{ st.title }}</h3>
          <p class="step-desc">{{ st.desc }}</p>
        </div>
      </div>
    </section>

    <!-- SHOWCASE -->
    <section id="showcase" class="section showcase-section">
      <div class="section-label">SHOWCASE</div>
      <h2 class="section-heading scroll-reveal">
        Rooms designed with <span class="gradient-text">DITO</span>
      </h2>
      <div class="showcase-grid">
        <div
          class="showcase-card scroll-reveal"
          *ngFor="let r of showcaseRooms"
          [style.background]="r.bg"
        >
          <div class="showcase-overlay">
            <div class="showcase-label">{{ r.label }}</div>
            <div class="showcase-sub">{{ r.sub }}</div>
            <button class="showcase-btn">View in studio →</button>
          </div>
        </div>
      </div>
    </section>

    <!-- TESTIMONIALS -->
    <section id="testimonials" class="section testimonials-section">
      <div class="section-label">TESTIMONIALS</div>
      <h2 class="section-heading scroll-reveal">
        Loved by <span class="gradient-text">designers worldwide</span>
      </h2>
      <div class="testimonials-grid">
        <div class="testimonial-card scroll-reveal" *ngFor="let t of testimonials">
          <div class="stars">★★★★★</div>
          <p class="testimonial-text">"{{ t.text }}"</p>
          <div class="testimonial-author">
            <div class="author-avatar" [style.background]="t.avatarBg">{{ t.initials }}</div>
            <div>
              <div class="author-name">{{ t.name }}</div>
              <div class="author-role">{{ t.role }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA SECTION -->
    <section class="cta-section cta-bg">
      <div class="cta-inner scroll-reveal">
        <h2 class="cta-heading">Ready to design your reality?</h2>
        <p class="cta-sub">
          Join 10,000+ designers using DITO to create stunning interiors.
        </p>
        <div class="cta-actions">
          <a routerLink="/auth/register" class="btn-white btn-lg">
            Get started for free <span class="btn-arrow">→</span>
          </a>
          <a routerLink="/auth/login" class="btn-outline-white btn-lg">Sign in</a>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="logo-icon" style="color:#2563EB">◈</span>
          <span class="footer-name">DITO</span>
        </div>
        <div class="footer-links">
          <a href="#features" class="footer-link">Features</a>
          <a href="#how" class="footer-link">How it works</a>
          <a href="#showcase" class="footer-link">Showcase</a>
          <a routerLink="/auth/login" class="footer-link">Sign in</a>
        </div>
        <div class="footer-copy">© 2025 DITO. All rights reserved.</div>
      </div>
    </footer>
  `,
  styles: [
    `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
      background: #FAFBFF;
      color: #1D1D1F;
      overflow-x: hidden;
    }

    /* ─── ANIMATIONS ─────────────────────────────────────────────── */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(32px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-12px); }
    }
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }

    .animate-fade-in-up { animation: fadeInUp 0.9s ease both; }

    /* ─── SCROLL REVEAL ───────────────────────────────────────────── */
    .scroll-reveal {
      opacity: 0;
      transform: translateY(40px);
      transition: opacity 0.8s ease, transform 0.8s ease;
    }
    .scroll-reveal.revealed {
      opacity: 1;
      transform: translateY(0);
    }
    .scroll-reveal:nth-child(1) { transition-delay: 0.1s; }
    .scroll-reveal:nth-child(2) { transition-delay: 0.2s; }
    .scroll-reveal:nth-child(3) { transition-delay: 0.3s; }

    /* ─── GLASS ───────────────────────────────────────────────────── */
    .glass {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }
    .glass-dark {
      background: rgba(29, 29, 31, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff;
    }
    .glass-white {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      color: #1D1D1F;
    }

    /* ─── NEUMORPHIC ──────────────────────────────────────────────── */
    .neumorphic {
      background: #F0F4FF;
      box-shadow:
        8px 8px 20px rgba(0, 0, 0, 0.08),
        -4px -4px 12px rgba(255, 255, 255, 0.9);
      border-radius: 24px;
    }

    /* ─── GRADIENT TEXT ───────────────────────────────────────────── */
    .gradient-text {
      background: linear-gradient(135deg, #2563EB 0%, #60A5FA 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* ─── BUTTONS ─────────────────────────────────────────────────── */
    .btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
      background: #2563EB;
      color: #fff;
      border-radius: 12px;
      padding: 12px 24px;
      font-size: 15px; font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 4px 20px rgba(37, 99, 235, 0.35);
    }
    .btn-primary:hover {
      background: #1D4ED8;
      box-shadow: 0 6px 28px rgba(37, 99, 235, 0.5);
      transform: translateY(-1px);
    }
    .btn-lg { padding: 14px 32px; font-size: 16px; border-radius: 14px; }
    .btn-arrow { font-size: 18px; transition: transform 0.2s; }
    .btn-primary:hover .btn-arrow { transform: translateX(4px); }

    .btn-outline {
      display: inline-flex; align-items: center; gap: 8px;
      background: transparent;
      color: #2563EB;
      border: 1.5px solid #2563EB;
      border-radius: 12px;
      padding: 12px 24px;
      font-size: 15px; font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-outline:hover {
      background: rgba(37, 99, 235, 0.06);
      transform: translateY(-1px);
    }

    .btn-ghost {
      display: inline-flex; align-items: center;
      background: transparent;
      color: #1D1D1F;
      border-radius: 10px;
      padding: 10px 20px;
      font-size: 15px; font-weight: 500;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-ghost:hover { background: rgba(0,0,0,0.05); }

    .btn-white {
      display: inline-flex; align-items: center; gap: 8px;
      background: #fff;
      color: #1D1D1F;
      border-radius: 14px;
      padding: 14px 32px;
      font-size: 16px; font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    }
    .btn-white:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.18); }

    .btn-outline-white {
      display: inline-flex; align-items: center; gap: 8px;
      background: transparent;
      color: rgba(255,255,255,0.9);
      border: 1.5px solid rgba(255,255,255,0.4);
      border-radius: 14px;
      padding: 14px 32px;
      font-size: 16px; font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-outline-white:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.7); }

    /* ─── NAV ─────────────────────────────────────────────────────── */
    .nav-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      padding: 0 24px;
    }
    .nav-inner {
      max-width: 1200px; margin: 0 auto;
      display: flex; align-items: center; gap: 40px;
      height: 68px;
    }
    .nav-logo {
      display: flex; align-items: center; gap: 8px;
      text-decoration: none; flex-shrink: 0;
    }
    .logo-icon { font-size: 22px; color: #2563EB; }
    .logo-text { font-size: 20px; font-weight: 700; color: #1D1D1F; letter-spacing: -0.5px; }
    .footer-name { font-size: 18px; font-weight: 700; color: #fff; }
    .nav-links {
      display: flex; align-items: center; gap: 8px;
      flex: 1;
    }
    .nav-link {
      color: #6E6E73; font-size: 14px; font-weight: 500;
      text-decoration: none;
      padding: 8px 14px; border-radius: 8px;
      transition: all 0.2s;
    }
    .nav-link:hover { color: #1D1D1F; background: rgba(0,0,0,0.05); }
    .nav-ctas { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    /* ─── HERO ────────────────────────────────────────────────────── */
    .hero-section {
      min-height: 100vh;
      padding: 140px 24px 80px;
      max-width: 1200px; margin: 0 auto;
    }
    .hero-content { text-align: center; margin-bottom: 56px; }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(37, 99, 235, 0.08);
      border: 1px solid rgba(37, 99, 235, 0.2);
      color: #2563EB;
      font-size: 13px; font-weight: 600; letter-spacing: 0.02em;
      padding: 6px 16px; border-radius: 100px;
      margin-bottom: 28px;
    }
    .badge-dot {
      width: 7px; height: 7px;
      background: #2563EB; border-radius: 50%;
      animation: pulse-dot 2s ease infinite;
    }
    .hero-heading {
      font-size: clamp(42px, 6vw, 72px);
      font-weight: 800;
      letter-spacing: -2.5px;
      line-height: 1.08;
      color: #1D1D1F;
      margin-bottom: 24px;
    }
    .hero-sub {
      font-size: clamp(16px, 2vw, 19px);
      color: #6E6E73; max-width: 560px; margin: 0 auto 36px;
      line-height: 1.6; font-weight: 400;
    }
    .hero-actions {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      flex-wrap: wrap; margin-bottom: 16px;
    }
    .hero-note { color: #6E6E73; font-size: 13px; }

    /* ─── HERO SLIDER ─────────────────────────────────────────────── */
    .hero-slider-wrapper { width: 100%; max-width: 900px; margin: 0 auto; }
    .hero-wrapper {
      position: relative;
      width: 100%; height: 520px;
      border-radius: 24px;
      overflow: hidden;
      box-shadow:
        0 32px 80px rgba(37, 99, 235, 0.18),
        0 8px 32px rgba(0,0,0,0.12);
    }
    .hero-canvas {
      position: absolute; inset: 0;
      width: 100% !important; height: 100% !important;
      display: block;
    }

    /* ─── REALISTIC ROOM ──────────────────────────────────────────── */
    .realistic-room {
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,248,220,0.85) 0%, transparent 60%),
        radial-gradient(ellipse 30% 50% at 78% 25%, rgba(255,220,100,0.45) 0%, transparent 55%),
        radial-gradient(ellipse 40% 30% at 50% 90%, rgba(180,140,80,0.35) 0%, transparent 60%),
        linear-gradient(180deg, #F5EFE0 0%, #E8DCC8 45%, #C4903C 100%);
      overflow: hidden;
    }

    /* Rug */
    .r-rug {
      position: absolute;
      bottom: 22%; left: 50%; transform: translateX(-50%);
      width: 55%; height: 22%;
      background: linear-gradient(135deg, #7B6BA8 0%, #5B4B85 100%);
      border-radius: 4px;
      opacity: 0.85;
      box-shadow: 0 4px 24px rgba(0,0,0,0.25);
    }

    /* Sofa */
    .r-sofa {
      position: absolute;
      bottom: 38%; left: 50%; transform: translateX(-50%);
      width: 48%; height: 18%;
      background: linear-gradient(160deg, #4A7FD0 0%, #2563EB 40%, #1E50B8 100%);
      border-radius: 10px 10px 4px 4px;
      box-shadow: 0 8px 32px rgba(37,99,235,0.35), inset 0 2px 0 rgba(255,255,255,0.25);
    }
    .r-sofa::before {
      content: '';
      position: absolute;
      bottom: 100%; left: 0; right: 0; height: 30%;
      background: linear-gradient(160deg, #5A8FE0 0%, #3573F5 100%);
      border-radius: 8px 8px 0 0;
      box-shadow: inset 0 2px 0 rgba(255,255,255,0.2);
    }

    /* Coffee Table */
    .r-table {
      position: absolute;
      bottom: 28%; left: 50%; transform: translateX(-50%);
      width: 26%; height: 6%;
      background: linear-gradient(180deg, #D4A84B 0%, #A87C2A 100%);
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }

    /* Plant */
    .r-plant {
      position: absolute;
      bottom: 32%; right: 8%;
      width: 60px; height: 90px;
    }
    .r-plant::before {
      content: '';
      position: absolute;
      bottom: 0; left: 50%; transform: translateX(-50%);
      width: 22px; height: 30px;
      background: linear-gradient(180deg, #C87840, #A05020);
      border-radius: 4px;
    }
    .r-plant::after {
      content: '';
      position: absolute;
      bottom: 26px; left: 50%; transform: translateX(-50%);
      width: 48px; height: 48px;
      background: radial-gradient(circle, #3AAA50, #1E7030);
      border-radius: 50%;
      box-shadow: 0 0 20px rgba(30,112,48,0.3);
    }

    /* Lamp glow */
    .r-lamp-glow {
      position: absolute;
      bottom: 32%; left: 10%;
      width: 80px; height: 140px;
    }
    .r-lamp-glow::before {
      content: '';
      position: absolute;
      bottom: 0; left: 50%; transform: translateX(-50%);
      width: 6px; height: 80px;
      background: linear-gradient(180deg, #888, #555);
      border-radius: 3px;
    }
    .r-lamp-glow::after {
      content: '';
      position: absolute;
      top: 0; left: 50%; transform: translateX(-50%);
      width: 40px; height: 30px;
      background: linear-gradient(180deg, #F5E6A0, #E8D060);
      clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%);
      box-shadow: 0 0 40px rgba(248,220,100,0.8);
    }

    /* Wall art */
    .r-art {
      position: absolute;
      top: 10%; left: 50%; transform: translateX(-50%);
      width: 18%; height: 22%;
      background: linear-gradient(135deg, #1a3a8a, #0f2060);
      border: 4px solid #C0A040;
      border-radius: 4px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    }

    /* Floor shadow */
    .r-floor-shadow {
      position: absolute;
      bottom: 0; left: 0; right: 0; height: 25%;
      background: linear-gradient(0deg, rgba(0,0,0,0.25) 0%, transparent 100%);
    }

    /* ─── SLIDER DIVIDER ──────────────────────────────────────────── */
    .slider-divider {
      position: absolute; top: 0; bottom: 0;
      width: 3px;
      background: rgba(255,255,255,0.9);
      box-shadow: 0 0 12px rgba(255,255,255,0.6);
      transform: translateX(-50%);
      pointer-events: none;
      z-index: 10;
    }
    .slider-handle {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 40px; height: 40px;
      background: #fff;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; color: #2563EB; font-weight: 700;
      box-shadow: 0 4px 20px rgba(37,99,235,0.3);
    }

    /* ─── SLIDER LABELS ───────────────────────────────────────────── */
    .slider-label {
      position: absolute; top: 16px;
      padding: 6px 14px;
      border-radius: 100px;
      font-size: 13px; font-weight: 600;
      pointer-events: none; z-index: 11;
    }
    .label-left { left: 16px; }
    .label-right { right: 16px; transition: opacity 0.4s ease; }
    .label-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
    .dot-blue { background: #60A5FA; }

    /* ─── STATS ───────────────────────────────────────────────────── */
    .stats-section {
      padding: 40px 24px;
      background: #fff;
      border-top: 1px solid rgba(0,0,0,0.06);
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    .stats-inner {
      max-width: 900px; margin: 0 auto;
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
    }
    .stat-card {
      background: #fff;
      border-radius: 20px;
      padding: 28px 20px;
      text-align: center;
      box-shadow: 0 2px 16px rgba(0,0,0,0.06);
      border: 1px solid rgba(0,0,0,0.05);
    }
    .stat-value {
      font-size: 36px; font-weight: 800;
      color: #2563EB; letter-spacing: -1px;
      margin-bottom: 4px;
    }
    .stat-label { font-size: 14px; color: #6E6E73; font-weight: 500; }

    /* ─── SECTION LAYOUT ──────────────────────────────────────────── */
    .section {
      padding: 100px 24px;
      max-width: 1200px; margin: 0 auto;
    }
    .section-label {
      display: block; text-align: center;
      font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
      color: #2563EB; margin-bottom: 16px;
      text-transform: uppercase;
    }
    .section-heading {
      font-size: clamp(32px, 4vw, 52px);
      font-weight: 800; letter-spacing: -1.5px;
      text-align: center; line-height: 1.1;
      margin-bottom: 20px;
    }
    .section-sub {
      font-size: 17px; color: #6E6E73; text-align: center;
      max-width: 560px; margin: 0 auto 60px; line-height: 1.6;
    }

    /* ─── FEATURES GRID ───────────────────────────────────────────── */
    .features-section { background: #FAFBFF; }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    .feature-card { padding: 32px; transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow:
        12px 12px 28px rgba(0,0,0,0.1),
        -6px -6px 16px rgba(255,255,255,0.95);
    }
    .feature-icon {
      width: 52px; height: 52px; border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; margin-bottom: 20px;
    }
    .feature-title { font-size: 18px; font-weight: 700; margin-bottom: 10px; color: #1D1D1F; }
    .feature-desc { font-size: 14px; color: #6E6E73; line-height: 1.65; }

    /* ─── HOW IT WORKS ────────────────────────────────────────────── */
    .how-section { background: #fff; max-width: 100%; padding: 100px 24px; }
    .steps-row {
      max-width: 900px; margin: 0 auto;
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 0; position: relative;
    }
    .step { text-align: center; padding: 0 24px; position: relative; }
    .step-number {
      width: 56px; height: 56px;
      background: linear-gradient(135deg, #2563EB, #60A5FA);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 800; color: #fff;
      margin: 0 auto 20px;
      box-shadow: 0 8px 24px rgba(37,99,235,0.35);
    }
    .step-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #1D1D1F; }
    .step-desc { font-size: 14px; color: #6E6E73; line-height: 1.65; }
    .step-line {
      position: absolute;
      top: 28px; left: calc(50% + 36px); right: calc(-50% + 36px);
      height: 2px;
      background: linear-gradient(90deg, #2563EB, #93C5FD);
      opacity: 0.4;
    }

    /* ─── SHOWCASE ────────────────────────────────────────────────── */
    .showcase-section { background: #FAFBFF; }
    .showcase-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
    }
    .showcase-card {
      border-radius: 20px; height: 340px;
      position: relative; overflow: hidden;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .showcase-card:hover { transform: translateY(-6px); box-shadow: 0 20px 48px rgba(0,0,0,0.15); }
    .showcase-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.65) 100%);
      display: flex; flex-direction: column;
      justify-content: flex-end; padding: 24px;
      opacity: 0; transition: opacity 0.3s ease;
    }
    .showcase-card:hover .showcase-overlay { opacity: 1; }
    .showcase-label { color: #fff; font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .showcase-sub { color: rgba(255,255,255,0.75); font-size: 13px; margin-bottom: 14px; }
    .showcase-btn {
      display: inline-block;
      background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.3);
      color: #fff; font-size: 13px; font-weight: 600;
      padding: 8px 16px; border-radius: 8px; cursor: pointer;
      width: fit-content; transition: background 0.2s;
    }
    .showcase-btn:hover { background: rgba(255,255,255,0.25); }

    /* ─── TESTIMONIALS ────────────────────────────────────────────── */
    .testimonials-section { max-width: 1200px; margin: 0 auto; padding: 100px 24px; }
    .testimonials-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
    }
    .testimonial-card {
      background: #fff;
      border-radius: 20px; padding: 32px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.07);
      border: 1px solid rgba(0,0,0,0.05);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .testimonial-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.1); }
    .stars { color: #F59E0B; font-size: 18px; margin-bottom: 16px; letter-spacing: 2px; }
    .testimonial-text { font-size: 15px; color: #3D3D3F; line-height: 1.7; margin-bottom: 24px; }
    .testimonial-author { display: flex; align-items: center; gap: 12px; }
    .author-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .author-name { font-size: 14px; font-weight: 700; color: #1D1D1F; }
    .author-role { font-size: 12px; color: #6E6E73; margin-top: 2px; }

    /* ─── CTA SECTION ─────────────────────────────────────────────── */
    .cta-section {
      padding: 100px 24px;
      background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
    }
    .cta-bg { background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); }
    .cta-inner { max-width: 700px; margin: 0 auto; text-align: center; }
    .cta-heading {
      font-size: clamp(36px, 5vw, 56px);
      font-weight: 800; letter-spacing: -1.5px;
      color: #fff; margin-bottom: 20px; line-height: 1.1;
    }
    .cta-sub { font-size: 18px; color: rgba(255,255,255,0.75); margin-bottom: 40px; }
    .cta-actions { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }

    /* ─── FOOTER ──────────────────────────────────────────────────── */
    .footer {
      background: #0F172A;
      padding: 40px 24px;
    }
    .footer-inner {
      max-width: 1200px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between;
      gap: 24px; flex-wrap: wrap;
    }
    .footer-brand { display: flex; align-items: center; gap: 8px; }
    .footer-links { display: flex; gap: 24px; }
    .footer-link { color: rgba(255,255,255,0.5); font-size: 14px; text-decoration: none; transition: color 0.2s; }
    .footer-link:hover { color: rgba(255,255,255,0.9); }
    .footer-copy { color: rgba(255,255,255,0.3); font-size: 13px; }

    /* ─── RESPONSIVE ──────────────────────────────────────────────── */
    @media (max-width: 900px) {
      .features-grid, .showcase-grid, .testimonials-grid { grid-template-columns: 1fr 1fr; }
      .steps-row { grid-template-columns: 1fr; }
      .step-line { display: none; }
      .stats-inner { grid-template-columns: repeat(2, 1fr); }
      .nav-links { display: none; }
    }
    @media (max-width: 600px) {
      .features-grid, .showcase-grid, .testimonials-grid { grid-template-columns: 1fr; }
      .stats-inner { grid-template-columns: repeat(2, 1fr); }
      .hero-wrapper { height: 360px; }
      .footer-inner { flex-direction: column; text-align: center; }
    }
    `,
  ],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('heroCanvas') heroCanvasRef!: ElementRef<HTMLCanvasElement>;

  private zone = inject(NgZone);

  sliderPos = signal(50);

  // ── Data ─────────────────────────────────────────────────────────
  readonly stats = [
    { value: '10K+', label: 'Designers' },
    { value: '50K+', label: 'Scenes created' },
    { value: '< 30s', label: 'Render time' },
    { value: '99.9%', label: 'Uptime' },
  ];

  readonly features = [
    {
      icon: '🗂️',
      iconBg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)',
      title: 'Metadata-Driven Design',
      desc: 'Every object carries rich semantic metadata — materials, dimensions, style tags — powering smart suggestions and instant search.',
    },
    {
      icon: '✨',
      iconBg: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)',
      title: 'AI Rendering',
      desc: 'One-click photorealistic renders powered by diffusion models. What you see in 3D becomes a stunning visual in under 30 seconds.',
    },
    {
      icon: '🪨',
      iconBg: 'linear-gradient(135deg,#FFF7ED,#FED7AA)',
      title: 'Material Intelligence',
      desc: 'Smart material swaps with real-world PBR textures. Preview oak, marble, concrete or velvet in real time without leaving the editor.',
    },
    {
      icon: '📸',
      iconBg: 'linear-gradient(135deg,#FDF4FF,#F3E8FF)',
      title: 'Snap Engine',
      desc: 'Furniture snaps to surfaces, aligns to walls and stacks intelligently. Declutter your workflow with physics-aware placement.',
    },
    {
      icon: '⚙️',
      iconBg: 'linear-gradient(135deg,#ECFDF5,#A7F3D0)',
      title: 'Parametric Properties',
      desc: 'Adjust width, depth, height and style with sliders. Objects rebuild themselves dynamically without manual remodelling.',
    },
    {
      icon: '👥',
      iconBg: 'linear-gradient(135deg,#EFF6FF,#BFDBFE)',
      title: 'Real-Time Collaboration',
      desc: 'Invite clients and teammates. See cursors move, comments appear and changes sync — all live, no refresh needed.',
    },
  ];

  readonly steps = [
    {
      title: 'Build your 3D scene',
      desc: 'Drag furniture, walls, and decor from a curated library into your parametric room canvas.',
    },
    {
      title: 'Tune materials & lighting',
      desc: 'Swap materials, adjust natural and artificial lighting, and preview mood in real time.',
    },
    {
      title: 'Generate AI render',
      desc: 'Hit render and receive a photorealistic image of your space in under 30 seconds — ready to share.',
    },
  ];

  readonly showcaseRooms = [
    {
      label: 'Scandinavian Living Room',
      sub: 'Light wood · Linen · Minimal',
      bg: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A0 40%, #C8B890 100%)',
    },
    {
      label: 'Modern Bedroom',
      sub: 'Dark oak · Velvet · Accent wall',
      bg: 'linear-gradient(135deg, #2D3142 0%, #4F5D75 50%, #BFC0C0 100%)',
    },
    {
      label: 'Industrial Kitchen',
      sub: 'Concrete · Steel · Edison bulbs',
      bg: 'linear-gradient(135deg, #3D3D3D 0%, #6B7280 60%, #9CA3AF 100%)',
    },
  ];

  readonly testimonials = [
    {
      text: 'DITO has completely changed how I present to clients. The AI renders look indistinguishable from real photography — and my clients love it.',
      name: 'Sarah Chen',
      role: 'Principal Designer, Studio Chen',
      initials: 'SC',
      avatarBg: 'linear-gradient(135deg, #2563EB, #60A5FA)',
    },
    {
      text: 'I used to spend two weeks iterating on a room concept. With DITO it takes an afternoon. The parametric system is genuinely brilliant.',
      name: 'Marcus Hofer',
      role: 'Interior Architect, Hofer & Partners',
      initials: 'MH',
      avatarBg: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
    },
    {
      text: 'The collaboration features alone are worth it. My client can leave comments directly on the 3D scene — no more endless email chains.',
      name: 'Priya Nair',
      role: 'Freelance Interior Designer',
      initials: 'PN',
      avatarBg: 'linear-gradient(135deg, #059669, #34D399)',
    },
  ];

  // ── Three.js internals ────────────────────────────────────────────
  private renderer: any = null;
  private scene: any = null;
  private camera: any = null;
  private controls: any = null;
  private animFrameId: number | null = null;
  private sliderFrameId: number | null = null;
  private observer: IntersectionObserver | null = null;

  // ── Lifecycle ─────────────────────────────────────────────────────
  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.initThreeScene();
      this.startSliderAnimation();
    });
    this.initScrollAnimations();
  }

  ngOnDestroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.sliderFrameId) cancelAnimationFrame(this.sliderFrameId);
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.renderer || !this.camera) return;
    const canvas = this.heroCanvasRef?.nativeElement;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  // ── Three.js ──────────────────────────────────────────────────────
  private async initThreeScene(): Promise<void> {
    let THREE: any;
    let OrbitControls: any;
    try {
      THREE = await import('three');
      const oc = await import('three/examples/jsm/controls/OrbitControls.js');
      OrbitControls = oc.OrbitControls;
    } catch {
      // Three.js not available — canvas stays hidden, slider still works
      return;
    }

    const canvas = this.heroCanvasRef?.nativeElement;
    if (!canvas) return;

    const w = canvas.clientWidth || 900;
    const h = canvas.clientHeight || 520;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xEEF3FF);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(5, 4, 7);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1, 0);
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = Math.PI / 4;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.update();

    this.buildThreeScene(THREE);
    this.renderLoop(THREE);
  }

  private buildThreeScene(THREE: any): void {
    const scene = this.scene;

    // Lights
    const ambient = new THREE.AmbientLight(0xC8D8FF, 0.8);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xFFFAF0, 2.5);
    dirLight.position.set(6, 10, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -8;
    dirLight.shadow.camera.right = 8;
    dirLight.shadow.camera.top = 8;
    dirLight.shadow.camera.bottom = -8;
    scene.add(dirLight);

    const hemi = new THREE.HemisphereLight(0xC8D8FF, 0xFFE8C0, 0.6);
    scene.add(hemi);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshLambertMaterial({ color: 0xC4903C })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 5.5),
      new THREE.MeshLambertMaterial({ color: 0xF5F0E8 })
    );
    backWall.position.set(0, 2.75, -4.5);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 5.5),
      new THREE.MeshLambertMaterial({ color: 0xEDE8DC })
    );
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-4.5, 2.75, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // ── Rug ──
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 2.0),
      new THREE.MeshLambertMaterial({ color: 0x5B4B85 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.01, 0.5);
    scene.add(rug);

    // ── Sofa ──
    const sofaMat = new THREE.MeshLambertMaterial({ color: 0x2563EB });
    const sofaCushMat = new THREE.MeshLambertMaterial({ color: 0x4A7FD0 });
    const sofaArmMat = new THREE.MeshLambertMaterial({ color: 0x1D4ED8 });

    // Base
    const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.0), sofaMat);
    sofaBase.position.set(0, 0.25, -0.8);
    sofaBase.castShadow = true;
    scene.add(sofaBase);

    // Back panel
    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.15), sofaMat);
    sofaBack.position.set(0, 0.9, -1.27);
    sofaBack.castShadow = true;
    scene.add(sofaBack);

    // Left arm
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.65, 1.0), sofaArmMat);
    armL.position.set(-1.375, 0.575, -0.8);
    armL.castShadow = true;
    scene.add(armL);

    // Right arm
    const armR = armL.clone();
    armR.position.x = 1.375;
    scene.add(armR);

    // Cushions
    [-0.8, 0, 0.8].forEach((x) => {
      const cush = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 0.85), sofaCushMat);
      cush.position.set(x, 0.61, -0.82);
      cush.castShadow = true;
      scene.add(cush);
    });

    // ── Coffee Table ──
    const tableMat = new THREE.MeshLambertMaterial({ color: 0xA87C2A });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.8), tableMat);
    tableTop.position.set(0, 0.46, 0.5);
    tableTop.castShadow = true;
    scene.add(tableTop);

    const legMat = new THREE.MeshLambertMaterial({ color: 0x8A6020 });
    [
      [-0.6, 0.1],
      [0.6, 0.1],
      [-0.6, 0.9],
      [0.6, 0.9],
    ].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45), legMat);
      leg.position.set(x, 0.225, z);
      scene.add(leg);
    });

    // ── Plant ──
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.12, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xC87840 })
    );
    pot.position.set(2.0, 0.15, -0.5);
    pot.castShadow = true;
    scene.add(pot);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0x2A8A40 })
    );
    leaves.position.set(2.0, 0.72, -0.5);
    leaves.castShadow = true;
    scene.add(leaves);

    // ── Floor Lamp ──
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08), metalMat);
    lampBase.position.set(-2.2, 0.04, -0.5);
    scene.add(lampBase);

    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2), metalMat);
    lampPole.position.set(-2.2, 1.14, -0.5);
    scene.add(lampPole);

    const shadeMat = new THREE.MeshLambertMaterial({ color: 0xF5E6A0, side: 2 });
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.4, 16, 1, true), shadeMat);
    shade.position.set(-2.2, 2.45, -0.5);
    shade.rotation.x = Math.PI;
    scene.add(shade);

    const lampLight = new THREE.PointLight(0xFFD880, 2.0, 4);
    lampLight.position.set(-2.2, 2.3, -0.5);
    lampLight.castShadow = false;
    scene.add(lampLight);

    // ── Wall Art ──
    const frameMat = new THREE.MeshLambertMaterial({ color: 0xC0A040 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.06), frameMat);
    frame.position.set(0, 2.8, -4.46);
    scene.add(frame);

    const artMat = new THREE.MeshLambertMaterial({ color: 0x0F2060 });
    const art = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.72, 0.06), artMat);
    art.position.set(0, 2.8, -4.43);
    scene.add(art);

    // ── Side Table ──
    const sideTable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xD4A84B })
    );
    sideTable.position.set(1.55, 0.25, -0.8);
    sideTable.castShadow = true;
    scene.add(sideTable);
  }

  private renderLoop(_THREE: any): void {
    this.animFrameId = requestAnimationFrame(() => this.renderLoop(_THREE));
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // ── Slider Animation ──────────────────────────────────────────────
  private startSliderAnimation(): void {
    let pos = 50;
    let dir = 1;
    let pauseFrames = 0;
    const speed = 0.25;
    const targets = { high: 82, low: 18 };
    const pauseDuration = 100;

    const tick = () => {
      this.sliderFrameId = requestAnimationFrame(tick);

      if (pauseFrames > 0) {
        pauseFrames--;
        return;
      }

      pos += speed * dir;

      if (dir === 1 && pos >= targets.high) {
        pos = targets.high;
        dir = -1;
        pauseFrames = pauseDuration;
      } else if (dir === -1 && pos <= targets.low) {
        pos = targets.low;
        dir = 1;
        pauseFrames = pauseDuration;
      }

      this.zone.run(() => this.sliderPos.set(Math.round(pos * 10) / 10));
    };

    tick();
  }

  // ── Scroll Animations ─────────────────────────────────────────────
  private initScrollAnimations(): void {
    setTimeout(() => {
      const elements = document.querySelectorAll('.scroll-reveal');
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('revealed');
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );
      elements.forEach((el) => this.observer!.observe(el));
    }, 100);
  }
}
