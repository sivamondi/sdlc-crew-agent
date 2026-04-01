import { useState } from 'react';
import { FileText, Download, Copy, Check, ChevronDown, ChevronRight, Package, HardDrive, Loader } from 'lucide-react';
import useStore from '../store/useStore';
import useLocalAgentStore from '../store/localAgentStore';
import MarkdownRenderer from './MarkdownRenderer';
import { downloadAllAsZip } from '../utils/downloadZip';
import { writeFile, writeBatch, parseCodeBlocks } from '../utils/localAgent';

export default function ReportPanel() {
  const { reports, projects, selectedProjectId } = useStore();
  const { connected: agentConnected } = useLocalAgentStore();
  const [expanded, setExpanded] = useState({});
  const [copied, setCopied] = useState(null);
  const [writingId, setWritingId] = useState(null);
  const [writtenIds, setWrittenIds] = useState(new Set());
  const [writingAll, setWritingAll] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;
  const repoPath = selectedProject?.repoPath;

  const toggleExpand = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const copyToClipboard = async (content, id) => {
    await navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    downloadAllAsZip(reports.map((r) => ({ filename: r.outputFile, content: r.content })));
  };

  const handleWriteToDisk = async (report) => {
    if (!repoPath) return alert('No project repo path set. Configure it in the Projects tab.');
    setWritingId(report.id);
    try {
      const parsedFiles = parseCodeBlocks(report.content, repoPath);
      if (parsedFiles.length > 0) {
        await writeBatch(parsedFiles);
      } else {
        await writeFile(`${repoPath}/${report.outputFile}`, report.content);
      }
      setWrittenIds((prev) => new Set([...prev, report.id]));
    } catch (err) {
      alert('Failed to write: ' + err.message);
    }
    setWritingId(null);
  };

  const handleWriteAllToDisk = async () => {
    if (!repoPath) return alert('No project repo path set. Configure it in the Projects tab.');
    setWritingAll(true);
    for (const report of reports) {
      try {
        const parsedFiles = parseCodeBlocks(report.content, repoPath);
        if (parsedFiles.length > 0) {
          await writeBatch(parsedFiles);
        } else {
          await writeFile(`${repoPath}/${report.outputFile}`, report.content);
        }
        setWrittenIds((prev) => new Set([...prev, report.id]));
      } catch {}
    }
    setWritingAll(false);
  };

  if (reports.length === 0) {
    return (
      <div className="report-empty">
        <FileText size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
        <p style={{ color: 'var(--text-muted)' }}>No reports yet. Run the pipeline to generate outputs.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} /> Reports ({reports.length})
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {agentConnected && (
            <button className="btn btn-sm" onClick={handleWriteAllToDisk} disabled={writingAll} style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontWeight: 600,
            }}>
              {writingAll ? <Loader size={14} className="spin" /> : <HardDrive size={14} />}
              {writingAll ? 'Writing...' : 'Write All to Disk'}
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={handleDownloadAll}>
            <Package size={14} /> Download All as ZIP
          </button>
        </div>
      </div>

      <div className="report-list">
        {reports.map((report) => (
          <div key={report.id} className="report-card">
            <div className="report-card-header" onClick={() => toggleExpand(report.id)}>
              <div className="report-card-left">
                {expanded[report.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <div className="report-agent-badge" style={{ background: report.agentColor }}>
                  {report.agentAvatar}
                </div>
                <div>
                  <div className="report-title">{report.label} — {report.agentName}</div>
                  <div className="report-filename">
                    {report.outputFile}
                    {writtenIds.has(report.id) && (
                      <span style={{ color: '#16a34a', marginLeft: 6, fontSize: 10 }}>
                        <Check size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> saved to disk
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="report-card-actions" onClick={(e) => e.stopPropagation()}>
                {agentConnected && (
                  <button
                    className="btn btn-sm"
                    onClick={() => handleWriteToDisk(report)}
                    disabled={writingId === report.id}
                    style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}
                    title="Write to project directory"
                  >
                    {writingId === report.id ? <Loader size={12} className="spin" /> : <HardDrive size={12} />}
                  </button>
                )}
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => copyToClipboard(report.content, report.id)}
                >
                  {copied === report.id ? <Check size={12} /> : <Copy size={12} />}
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => downloadFile(report.outputFile, report.content)}
                >
                  <Download size={12} />
                </button>
              </div>
            </div>
            {expanded[report.id] && (
              <div className="report-content">
                <MarkdownRenderer content={report.content} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
