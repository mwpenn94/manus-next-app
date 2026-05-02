/**
 * ConnectorBrandIcon — Renders proper brand SVG logos for connectors
 * instead of generic emoji characters. Falls back to emoji for unknown IDs.
 */
import React from "react";

const BRAND_SVGS: Record<string, React.FC<{ className?: string }>> = {
  slack: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
      <path d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" fill="#ECB22E"/>
    </svg>
  ),
  github: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
  gmail: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
    </svg>
  ),
  outlook: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M24 7.387v10.478c0 .23-.08.424-.238.576a.806.806 0 0 1-.588.236h-8.42v-8.55l1.903 1.322a.35.35 0 0 0 .41 0l6.674-4.665a.236.236 0 0 1 .26.003v.6z" fill="#0072C6"/>
      <path d="M15.072 8.39L14.754 8.6v-2.3h8.42c.226 0 .42.08.588.236.166.156.238.346.238.576v.275l-6.674 4.665a.35.35 0 0 1-.41 0L15.072 8.39z" fill="#0072C6"/>
      <path d="M7.5 10.5c0-1.38.56-2.63 1.464-3.536A4.992 4.992 0 0 1 12.5 5.5h-12v13h12a4.992 4.992 0 0 1-3.536-1.464A4.992 4.992 0 0 1 7.5 13.5v-3z" fill="#0072C6"/>
      <ellipse cx="7" cy="12" rx="3.5" ry="3" fill="#0072C6"/>
    </svg>
  ),
  notion: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.1 2.168c-.42-.326-.98-.7-2.055-.607L3.01 2.721c-.466.046-.56.28-.374.466l1.823 1.021zm.793 3.358v13.895c0 .746.373 1.026 1.213.98l14.523-.84c.84-.046.933-.56.933-1.166V6.63c0-.606-.233-.933-.746-.886l-15.177.886c-.56.047-.746.327-.746.933zm14.337.42c.093.42 0 .84-.42.886l-.7.14v10.264c-.607.327-1.166.513-1.633.513-.746 0-.933-.233-1.493-.933l-4.573-7.186v6.953l1.446.327s0 .84-1.166.84l-3.218.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.093-.42.14-1.026.793-1.073l3.451-.233 4.76 7.28v-6.44l-1.213-.14c-.093-.513.28-.886.746-.933l3.218-.186z"/>
    </svg>
  ),
  "google-drive": ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M7.71 3.5L1.15 15l3.44 5.96h6.87L7.71 3.5z" fill="#0066DA"/>
      <path d="M16.29 3.5H7.71l3.75 17.46h12.39L16.29 3.5z" fill="#00AC47"/>
      <path d="M1.15 15l3.44 5.96L16.29 3.5H7.71L1.15 15z" fill="#EA4335"/>
      <path d="M16.29 3.5l7.56 17.46h-12.4L16.29 3.5z" fill="#00832D"/>
      <path d="M4.59 20.96h6.87l-3.75-17.46L1.15 15l3.44 5.96z" fill="#2684FC"/>
      <path d="M23.85 15l-3.44 5.96H11.46L23.85 15z" fill="#FFBA00"/>
    </svg>
  ),
  calendar: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M18 2H6a4 4 0 0 0-4 4v12a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4V6a4 4 0 0 0-4-4z" fill="#4285F4"/>
      <path d="M16 1v4M8 1v4M2 9h20" stroke="#fff" strokeWidth="1.5"/>
      <text x="12" y="17" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">31</text>
    </svg>
  ),
  "microsoft-365": ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  ),
  openai: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  ),
  anthropic: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.603L16.742 20.48h-3.603L6.57 3.52zM0 20.48h3.603L10.172 3.52H6.57L0 20.48z"/>
    </svg>
  ),
  vercel: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L24 22H0L12 1z"/>
    </svg>
  ),
  stripe: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#635BFF"/>
      <path d="M13.976 9.15c-2.059-.09-3.286.92-3.286.92l-.186-1.035h-2.39v10.08h2.717v-5.39c0-1.71 1.323-2.242 2.376-2.13V9.15zm-6.283-.08c-.67 0-1.159.22-1.5.56l-.11-.48H3.67v10.08h2.717v-5.39c0-.84.28-1.41.84-1.41.56 0 .7.56.7 1.41v5.39h2.717v-5.95c0-2.24-1.11-3.21-2.951-3.21z" fill="#fff"/>
    </svg>
  ),
  "stripe-api": ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#635BFF"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M12.3 8.4c0-.66.54-1.14 1.32-1.14.78 0 1.56.36 2.16.96l1.44-1.68C16.26 5.58 15.06 5.1 13.62 5.1c-2.1 0-3.54 1.26-3.54 3.06 0 3.18 4.38 2.58 4.38 3.96 0 .72-.66 1.14-1.5 1.14-.96 0-1.86-.48-2.52-1.14l-1.44 1.74c1.08 1.02 2.46 1.56 3.84 1.56 2.16 0 3.78-1.08 3.78-3.12 0-3.36-4.32-2.76-4.32-3.9z" fill="#fff"/>
    </svg>
  ),
  dropbox: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="#0061FF">
      <path d="M6 2l6 3.75L6 9.5 0 5.75 6 2zm12 0l6 3.75-6 3.75-6-3.75L18 2zM0 13.25L6 9.5l6 3.75L6 17 0 13.25zm18-3.75l6 3.75L18 17l-6-3.75L18 9.5zM6 18.25l6-3.75 6 3.75-6 3.75-6-3.75z"/>
    </svg>
  ),
  zapier: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="#FF4A00">
      <path d="M15.535 8.465l-1.414-1.414L12 9.172 9.879 7.05 8.465 8.465 10.586 10.586l-2.121 2.121 1.414 1.414L12 12l2.121 2.121 1.414-1.414-2.121-2.121 2.121-2.121zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  ),
  supabase: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M13.7 21.8c-.4.5-1.3.2-1.3-.5V13h8.1c.9 0 1.3 1 .7 1.6L13.7 21.8z" fill="#3ECF8E"/>
      <path d="M13.7 21.8c-.4.5-1.3.2-1.3-.5V13h8.1c.9 0 1.3 1 .7 1.6L13.7 21.8z" fill="url(#a)" fillOpacity=".2"/>
      <path d="M10.3 2.2c.4-.5 1.3-.2 1.3.5V11H3.5c-.9 0-1.3-1-.7-1.6L10.3 2.2z" fill="#3ECF8E"/>
      <defs><linearGradient id="a" x1="12.4" y1="15.2" x2="18.5" y2="18.2" gradientUnits="userSpaceOnUse"><stop stopColor="#249361"/><stop offset="1" stopColor="#3ECF8E"/></linearGradient></defs>
    </svg>
  ),
  linear: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M2.513 12.833l8.654 8.654a9.953 9.953 0 0 1-8.654-8.654zm-.36-2.06A9.987 9.987 0 0 1 5.62 4.38l14 14a9.987 9.987 0 0 1-6.393 3.467L2.153 10.773zm5.88-7.866l13.06 13.06A9.96 9.96 0 0 0 22 12c0-5.523-4.477-10-10-10a9.96 9.96 0 0 0-3.967.907z" fill="#5E6AD2"/>
    </svg>
  ),
  hubspot: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="#FF7A59">
      <path d="M17.5 8.2V5.7a2 2 0 0 0 1.2-1.8 2 2 0 1 0-4 0c0 .8.5 1.5 1.2 1.8v2.5a5.4 5.4 0 0 0-2.7 1.3L6.4 4.8a2.3 2.3 0 0 0 .1-.6 2.2 2.2 0 1 0-2.2 2.2c.5 0 .9-.2 1.3-.4l6.6 4.6a5.4 5.4 0 0 0 0 5.8l-2 2a2.1 2.1 0 0 0-.7-.1 2.2 2.2 0 1 0 2.2 2.2c0-.3 0-.5-.1-.7l2-2a5.4 5.4 0 1 0 3.9-9.6z"/>
    </svg>
  ),
  email: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
  n8n: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#EA4B71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  perplexity: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L4 5v6l8 4 8-4V5l-8-4zm0 2.18L18 7v3.64l-6 3-6-3V7l6-3.82zM4 13v6l8 4 8-4v-6l-8 4-8-4z"/>
    </svg>
  ),
  elevenlabs: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="8" y="2" width="3" height="20" rx="1.5"/>
      <rect x="13" y="2" width="3" height="20" rx="1.5"/>
    </svg>
  ),
  huggingface: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="#FFD21E">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
      <circle cx="8.5" cy="10" r="1.5" fill="#000"/>
      <circle cx="15.5" cy="10" r="1.5" fill="#000"/>
      <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#000" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  firecrawl: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8 2 6 6 6 10c0 2 1 4 2 5.5C9 17 10 19 12 22c2-3 3-5 4-6.5 1-1.5 2-3.5 2-5.5 0-4-2-8-6-8z" fill="#FF6B35"/>
      <path d="M12 6c-2 0-3 2-3 4s1 3 1.5 4c.5 1 1 2 1.5 3 .5-1 1-2 1.5-3S15 12 15 10s-1-4-3-4z" fill="#FFD700"/>
    </svg>
  ),
  canva: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#00C4CC"/>
      <path d="M12 7c-2.8 0-5 2.2-5 5s2.2 5 5 5c1.4 0 2.6-.6 3.5-1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  webflow: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="#4353FF">
      <path d="M17.802 7.5S15.292 13.298 15.1 13.748c-.06-.45-1.88-6.248-1.88-6.248S11.26 7.5 9.548 7.5c.06.3 1.88 6.148 1.88 6.148s-2.18-3.448-3.64-3.448c0 0-.3 2.548 1.14 5.298.9 1.698 2.7 2.998 4.74 3.048 2.04.06 3.96-1.2 4.92-3.048 1.5-2.848 1.14-5.298 1.14-5.298-1.44 0-3.64 3.448-3.64 3.448s1.82-5.848 1.88-6.148c-1.74 0-3.7 0-3.7 0z"/>
    </svg>
  ),
  similarweb: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#1B2A4A"/>
      <path d="M7 14l3-4 3 2 4-5" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  posthog: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 12h4v8h12v-8h4L12 2z" fill="#1D4AFF"/>
      <circle cx="10" cy="14" r="1.5" fill="#fff"/>
      <circle cx="14" cy="14" r="1.5" fill="#fff"/>
    </svg>
  ),
  mailchimp: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="#FFE01B">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
      <path d="M15 10c0-1.66-1.34-3-3-3s-3 1.34-3 3c0 1.3.84 2.4 2 2.82V16h2v-3.18c1.16-.42 2-1.52 2-2.82z" fill="#000"/>
    </svg>
  ),
  airtable: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M11.5 2.6L3 6.4v11.2l8.5 3.8V2.6z" fill="#FCB400"/>
      <path d="M12.5 2.6L21 6.4v11.2l-8.5 3.8V2.6z" fill="#18BFFF"/>
      <path d="M12 12L3 6.4l9-3.8 9 3.8L12 12z" fill="#F82B60"/>
    </svg>
  ),
  asana: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="#F06A6A">
      <circle cx="12" cy="6" r="4"/>
      <circle cx="5" cy="16" r="4"/>
      <circle cx="19" cy="16" r="4"/>
    </svg>
  ),
  todoist: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="#E44332">
      <path d="M21 4.5H3v2l9 5 9-5v-2zM3 9.5v2l9 5 9-5v-2l-9 5-9-5zM3 14.5v2l9 5 9-5v-2l-9 5-9-5z"/>
    </svg>
  ),
  neon: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M4 4h16v12l-4-4v8L4 20V4z" fill="#00E599"/>
    </svg>
  ),
  cloudflare: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M16.5 16.5H5.2c-.3 0-.4-.3-.2-.5l2-2.5c.2-.2.5-.4.8-.4h11.7c.1-.5.2-1 .2-1.5 0-3-2.5-5.5-5.5-5.5-2.6 0-4.8 1.8-5.4 4.2-.5-.3-1.1-.5-1.8-.5-2 0-3.5 1.6-3.5 3.5 0 .3 0 .6.1.9C1.7 14.7 0 16.5 0 18.8h17.5" fill="#F38020"/>
      <path d="M19 8.5c-.2 0-.4 0-.5.1C18 6.5 16.2 5 14 5c-1.7 0-3.2 1-3.9 2.4" stroke="#FAAE40" strokeWidth="1.5"/>
    </svg>
  ),
  playwright: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#2EAD33"/>
      <path d="M8 9l3 6M13 9l3 6M7 13h4M13 13h4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  paypal: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 2.56A.77.77 0 0 1 5.704 2h5.836c2.137 0 3.852.588 4.674 2.023.39.682.555 1.418.493 2.188-.006.082-.013.163-.022.244l-.003.017v.046c-.372 2.47-2.073 3.963-4.77 4.188h-.002l-.236.02H9.38a.77.77 0 0 0-.76.644l-.89 5.637-.247 1.57a.641.641 0 0 1-.633.54h.226z" fill="#253B80"/>
      <path d="M19.082 7.033c-.372 2.47-2.073 3.963-4.77 4.188h-.002l-.236.02H11.78a.77.77 0 0 0-.76.644l-.89 5.637-.247 1.57a.641.641 0 0 1-.633.54h3.38a.675.675 0 0 0 .667-.576l.028-.14.527-3.342.034-.184a.675.675 0 0 1 .667-.576h.42c2.72 0 4.85-1.104 5.473-4.296.26-1.334.125-2.448-.562-3.23a2.7 2.7 0 0 0-.774-.555" fill="#179BD7"/>
    </svg>
  ),
};

interface ConnectorBrandIconProps {
  id: string;
  emoji: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function ConnectorBrandIcon({ id, emoji, className, size = "md" }: ConnectorBrandIconProps) {
  const SvgIcon = BRAND_SVGS[id];
  if (SvgIcon) {
    return <SvgIcon className={`${sizeMap[size]} ${className ?? ""}`} />;
  }
  // Fallback to emoji for unknown connectors
  return <span className={`${size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg"} ${className ?? ""}`}>{emoji}</span>;
}
