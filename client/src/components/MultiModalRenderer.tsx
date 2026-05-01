import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { File as FileIcon, Download, Copy, X, ArrowUpDown, FileText, FileCode, FileImage, FileArchive } from 'lucide-react';

// --- TYPE DEFINITIONS ---

export type ContentBlock =
  | { type: 'image'; url: string; alt: string; width?: number; height?: number }
  | { type: 'chart'; chartType: 'bar' | 'line' | 'pie' | 'scatter'; data: { labels: string[]; datasets: Array<{ label: string; data: number[]; color?: string }> }; title?: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'code'; language: string; content: string; filename?: string }
  | { type: 'iframe'; url: string; title?: string; height?: number }
  | { type: 'file'; filename: string; size: number; downloadUrl: string; mimeType: string };

interface MultiModalRendererProps {
  blocks: ContentBlock[];
  className?: string;
}

// --- HELPER FUNCTIONS ---

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="w-8 h-8 text-muted-foreground" />;
    if (mimeType.startsWith('text/')) return <FileText className="w-8 h-8 text-muted-foreground" />;
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html')) return <FileCode className="w-8 h-8 text-muted-foreground" />;
    if (mimeType.startsWith('application/zip') || mimeType.startsWith('application/x-rar-compressed')) return <FileArchive className="w-8 h-8 text-muted-foreground" />;
    return <FileIcon className="w-8 h-8 text-muted-foreground" />;
}

// --- CHILD COMPONENTS ---

const ImageBlock = ({ url, alt, width, height }: Extract<ContentBlock, { type: 'image' }>) => {
  const [isLightboxOpen, setLightboxOpen] = useState(false);
  const [isLoaded, setLoaded] = useState(false);

  return (
    <>
      <div className="w-full md:w-1/2 cursor-pointer group" onClick={() => setLightboxOpen(true)}>
        <div
          className={cn('relative w-full bg-muted rounded-lg overflow-hidden', !isLoaded && 'h-64 animate-pulse')}
          style={{ aspectRatio: width && height ? `${width}/${height}` : '16/9' }}
        >
          <img
            src={url}
            alt={alt}
            onLoad={() => setLoaded(true)}
            className={cn('rounded-lg object-cover w-full h-full transition-transform duration-300 group-hover:scale-105', !isLoaded && 'hidden')}
          />
        </div>
      </div>
      {isLightboxOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setLightboxOpen(false)}>
          <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <img src={url} alt={alt} className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" />
          </motion.div>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors" onClick={() => setLightboxOpen(false)}><X size={32} /></button>
        </div>
      )}
    </>
  );
};

const CodeBlock = ({ content, language, filename }: Extract<ContentBlock, { type: 'code' }>) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground">
        <span>{filename || language}</span>
        <button onClick={handleCopy} className="flex items-center gap-1.5 hover:text-foreground transition-colors disabled:opacity-50" disabled={copied}>
          {copied ? <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Copied!</> : <><Copy size={14} />Copy code</>}
        </button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto"><code>{content}</code></pre>
    </div>
  );
};

const IframeBlock = ({ url, title, height = 500 }: Extract<ContentBlock, { type: 'iframe' }>) => {
  const [isLoading, setLoading] = useState(true);

  return (
    <div className="relative w-full" style={{ height }}>
      {isLoading && <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />}
      <iframe
        src={url}
        title={title}
        height={height}
        onLoad={() => setLoading(false)}
        className={cn('w-full h-full rounded-lg border border-border', isLoading && 'invisible')}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

const FileBlock = ({ filename, size, downloadUrl, mimeType }: Extract<ContentBlock, { type: 'file' }>) => {
  return (
    <div className="bg-card p-4 rounded-lg border border-border flex items-center justify-between hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4 overflow-hidden">
        {getFileIcon(mimeType)}
        <div className="overflow-hidden">
          <p className="font-medium truncate">{filename}</p>
          <p className="text-sm text-muted-foreground">{formatFileSize(size)} &middot; {mimeType}</p>
        </div>
      </div>
      <a href={downloadUrl} download className="ml-4 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2 shrink-0">
        <Download size={16} />
        <span>Download</span>
      </a>
    </div>
  );
};

const TableBlock = ({ headers, rows }: Extract<ContentBlock, { type: 'table' }>) => {
  const [sortConfig, setSortConfig] = useState<{ key: number; direction: 'asc' | 'desc' } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;
    const sortableRows = [...rows];
    sortableRows.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableRows;
  }, [rows, sortConfig]);

  const requestSort = (key: number) => {
    const direction = (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  return (
    <div className="w-full overflow-x-auto border border-border rounded-lg">
      <table className="min-w-full divide-y divide-border bg-card">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((header, index) => (
              <th key={index} onClick={() => requestSort(index)} className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors">
                <span className="flex items-center gap-2">{header} <ArrowUpDown size={14} /></span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="even:bg-muted/20 hover:bg-muted/40 transition-colors">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ChartBlock = ({ chartType, data, title }: Extract<ContentBlock, { type: 'chart' }>) => {
  const renderChart = () => {
    const { labels, datasets } = data;
    const dataset = datasets[0];
    const colors = dataset.color ? [dataset.color] : ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#14b8a6'];
    const getColor = (i: number) => colors[i % colors.length];
    const svgProps = { width: "100%", height: "300", className: "w-full h-auto" };

    switch (chartType) {
      case 'bar': {
        const maxVal = Math.max(...dataset.data, 0);
        const padding = { top: 20, right: 20, bottom: 30, left: 40 };
        const chartWidth = 500;
        const chartHeight = 300;
        const barWidth = (chartWidth - padding.left - padding.right) / labels.length * 0.8;
        const barSpacing = (chartWidth - padding.left - padding.right) / labels.length * 0.2;
        return (
          <svg {...svgProps} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={chartHeight - padding.bottom} stroke="currentColor" className="text-border" />
            <line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} stroke="currentColor" className="text-border" />
            {dataset.data.map((d, i) => {
              const barHeight = maxVal > 0 ? (d / maxVal) * (chartHeight - padding.top - padding.bottom) : 0;
              const x = padding.left + i * (barWidth + barSpacing) + barSpacing / 2;
              const y = chartHeight - padding.bottom - barHeight;
              return (
                <g key={i}>
                  <rect x={x} y={y} width={barWidth} height={barHeight} fill={getColor(i)} />
                  <text x={x + barWidth / 2} y={chartHeight - padding.bottom + 15} textAnchor="middle" fontSize="12" className="fill-current text-muted-foreground">{labels[i]}</text>
                </g>
              );
            })}
          </svg>
        );
      }
      case 'line': {
        const maxVal = Math.max(...dataset.data);
        const chartWidth = 500;
        const pointGap = (chartWidth - 40) / (labels.length > 1 ? labels.length - 1 : 1);
        const path = dataset.data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${20 + i * pointGap} ${300 - 20 - (d / maxVal) * 260}`).join(' ');
        return (
          <svg {...svgProps} viewBox={`0 0 ${chartWidth} 300`}>
            <path d={path} fill="none" stroke={getColor(0)} strokeWidth="2" />
            {dataset.data.map((d, i) => (
              <circle key={i} cx={20 + i * pointGap} cy={300 - 20 - (d / maxVal) * 260} r="4" fill={getColor(0)} />
            ))}
          </svg>
        );
      }
      case 'pie': {
        const total = dataset.data.reduce((a, b) => a + b, 0);
        if (total === 0) return null;
        let startAngle = -Math.PI / 2;
        return (
          <svg {...svgProps} viewBox="-1 -1 2 2" style={{ maxWidth: 250, margin: 'auto' }}>
            {dataset.data.map((d, i) => {
              const sliceAngle = (d / total) * 2 * Math.PI;
              const x1 = Math.cos(startAngle);
              const y1 = Math.sin(startAngle);
              startAngle += sliceAngle;
              const x2 = Math.cos(startAngle);
              const y2 = Math.sin(startAngle);
              const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
              const pathData = `M ${x1} ${y1} A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2} L 0 0 Z`;
              return <path key={i} d={pathData} fill={getColor(i)} />;
            })}
          </svg>
        );
      }
      default: return null;
    }
  };

  return (
    <div className="bg-card p-4 rounded-lg border border-border w-full md:w-1/2">
      {title && <h3 className="font-semibold mb-4 text-center text-foreground">{title}</h3>}
      {renderChart()}
    </div>
  );
};

// --- MAIN RENDERER ---

const renderBlock = (block: ContentBlock) => {
  switch (block.type) {
    case 'image': return <ImageBlock {...block} />;
    case 'chart': return <ChartBlock {...block} />;
    case 'table': return <TableBlock {...block} />;
    case 'code': return <CodeBlock {...block} />;
    case 'iframe': return <IframeBlock {...block} />;
    case 'file': return <FileBlock {...block} />;
    default: return null;
  }
};

export const MultiModalRenderer = ({ blocks, className }: MultiModalRendererProps) => {
  return (
    <div className={cn('space-y-6', className)}>
      {blocks.map((block, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] as const, delay: index * 0.1 }}
        >
          {renderBlock(block)}
        </motion.div>
      ))}
    </div>
  );
};