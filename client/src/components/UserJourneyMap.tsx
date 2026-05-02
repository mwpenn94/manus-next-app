
import React, { useState, useMemo } from 'react';
import type { FC } from 'react';
import { Smile, Meh, Frown, Lightbulb, MessageSquareWarning, ChevronDown, ChevronUp, Map, Users, ShoppingCart, Star } from 'lucide-react';

type Emotion = 'positive' | 'neutral' | 'negative';

interface Touchpoint {
  id: string;
  action: string;
  emotion: Emotion;
  painPoint?: string;
  opportunity?: string;
}

interface JourneyStage {
  id: string;
  name: string;
  icon: FC<{ className?: string }>;
  touchpoints: Touchpoint[];
}

const journeyData: JourneyStage[] = [
  {
    id: 'discovery',
    name: 'Discovery',
    icon: Map,
    touchpoints: [
      { id: 'd1', action: 'Sees ad on social media', emotion: 'neutral', painPoint: 'Ad is not memorable.', opportunity: 'Use video ads for higher engagement.' },
      { id: 'd2', action: 'Hears about product from a friend', emotion: 'positive', opportunity: 'Implement a referral program.' },
      { id: 'd3', action: 'Searches for solutions online', emotion: 'neutral', painPoint: 'Competitors rank higher in search results.', opportunity: 'Invest in SEO for target keywords.' },
    ],
  },
  {
    id: 'consideration',
    name: 'Consideration',
    icon: Users,
    touchpoints: [
      { id: 'c1', action: 'Visits website to learn more', emotion: 'positive', painPoint: 'Website loading speed is slow on mobile.', opportunity: 'Optimize images and use a CDN.' },
      { id: 'c2', action: 'Compares features with competitors', emotion: 'neutral', painPoint: 'Unique selling proposition is not clear.', opportunity: 'Create a detailed comparison page.' },
      { id: 'c3', action: 'Reads customer reviews', emotion: 'positive', opportunity: 'Showcase positive reviews more prominently.' },
    ],
  },
  {
    id: 'purchase',
    name: 'Purchase',
    icon: ShoppingCart,
    touchpoints: [
      { id: 'p1', action: 'Selects a subscription plan', emotion: 'positive', painPoint: 'Pricing tiers are confusing.', opportunity: 'Simplify pricing and add a feature matrix.' },
      { id: 'p2', action: 'Goes through checkout process', emotion: 'negative', painPoint: 'Requires too many form fields.', opportunity: 'Implement one-click purchase with Apple/Google Pay.' },
      { id: 'p3', action: 'Receives order confirmation email', emotion: 'positive', opportunity: 'Include a getting-started guide in the email.' },
    ],
  },
  {
    id: 'retention',
    name: 'Retention',
    icon: Star,
    touchpoints: [
      { id: 'r1', action: 'Onboarding experience', emotion: 'positive', opportunity: 'Personalize onboarding based on user role.' },
      { id: 'r2', action: 'Contacts customer support', emotion: 'negative', painPoint: 'Long wait times for support.', opportunity: 'Implement a chatbot for common questions.' },
      { id: 'r3', action: 'Receives monthly newsletter', emotion: 'neutral', painPoint: 'Newsletter content is not relevant.', opportunity: 'Segment users and tailor newsletter content.' },
    ],
  },
];

const emotionIcons: Record<Emotion, React.ReactElement> = {
  positive: <Smile className="w-5 h-5 text-green-400" />,
  neutral: <Meh className="w-5 h-5 text-yellow-400" />,
  negative: <Frown className="w-5 h-5 text-red-400" />,
};

const emotionYPosition: Record<Emotion, number> = {
  positive: 20,
  neutral: 50,
  negative: 80,
};

export default function UserJourneyMap() {
  const [expandedStage, setExpandedStage] = useState<string | null>(journeyData[0].id);
  const [visibleDetails, setVisibleDetails] = useState<'all' | 'pain' | 'opportunity'>('all');

  const emotionPath = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    let currentX = 12.5; // Start at 12.5% of the width
    journeyData.forEach(stage => {
      stage.touchpoints.forEach(tp => {
        points.push({ x: currentX, y: emotionYPosition[tp.emotion] });
        currentX += (100 - 25) / (journeyData.flatMap(j => j.touchpoints).length -1) ; // Distribute points across remaining 75%
      });
    });

    if (points.length === 0) return '';

    const path = points.map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cp1x = prev.x + (p.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (p.x - prev.x) / 2;
      const cp2y = p.y;
      return `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
    }).join(' ');

    return path;
  }, []);

  const allTouchpoints = journeyData.flatMap(j => j.touchpoints);

  return (
    <div className="bg-[#0a0a0a] text-white/90 p-4 sm:p-6 lg:p-8 font-sans w-full min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-white">User Journey Map</h1>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0 bg-[#1a1a1a] border border-white/10 rounded-lg p-1">
            <button onClick={() => setVisibleDetails('all')} className={`px-3 py-1 text-sm rounded-md ${visibleDetails === 'all' ? 'bg-white/10' : 'text-white/60'}`}>All</button>
            <button onClick={() => setVisibleDetails('pain')} className={`px-3 py-1 text-sm rounded-md ${visibleDetails === 'pain' ? 'bg-white/10' : 'text-white/60'}`}>Pain Points</button>
            <button onClick={() => setVisibleDetails('opportunity')} className={`px-3 py-1 text-sm rounded-md ${visibleDetails === 'opportunity' ? 'bg-white/10' : 'text-white/60'}`}>Opportunities</button>
          </div>
        </div>

        <div className="relative mb-8">
          <svg width="100%" height="100" className="absolute top-0 left-0 w-full">
            <path d={emotionPath} fill="none" stroke="url(#emotionGradient)" strokeWidth="2" />
            <defs>
              <linearGradient id="emotionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
            </defs>
          </svg>
          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-x-4 pt-28">
            {journeyData.map((stage, stageIndex) => (
              <div key={stage.id} className="flex flex-col items-center">
                <div className="flex items-center text-lg font-semibold text-white">
                  <stage.icon className="w-6 h-6 mr-2" />
                  {stage.name}
                </div>
                <div className="w-full h-1 bg-white/10 mt-2 mb-8"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4">
          {journeyData.map(stage => (
            <div key={stage.id} className="border border-white/10 rounded-lg bg-[#121212] p-4 flex flex-col">
              <button 
                className="flex justify-between items-center w-full text-left mb-4" 
                onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
              >
                <div className="flex items-center text-lg font-semibold text-white">
                  <stage.icon className="w-6 h-6 mr-2 md:hidden" />
                  {stage.name}
                </div>
                {expandedStage === stage.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              <div className={`flex-grow space-y-4 transition-all duration-300 ease-in-out ${expandedStage === stage.id ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                {stage.touchpoints.map(tp => (
                  <div key={tp.id} className="bg-[#1a1a1a] p-3 rounded-md border border-white/10">
                    <div className="flex justify-between items-start">
                      <p className="text-sm text-white/80 flex-1 pr-2">{tp.action}</p>
                      {emotionIcons[tp.emotion]}
                    </div>
                    {(visibleDetails === 'all' || visibleDetails === 'pain') && tp.painPoint && (
                      <div className="mt-2 flex items-start text-xs text-red-400/80">
                        <MessageSquareWarning className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{tp.painPoint}</span>
                      </div>
                    )}
                    {(visibleDetails === 'all' || visibleDetails === 'opportunity') && tp.opportunity && (
                      <div className="mt-2 flex items-start text-xs text-blue-400/80">
                        <Lightbulb className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{tp.opportunity}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
