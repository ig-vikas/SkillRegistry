import ReactMarkdown from 'react-markdown';

interface SkillReadmeProps {
  content: string;
}

export function SkillReadme({ content }: SkillReadmeProps) {
  return (
    <div className="prose prose-invert max-w-none prose-headings:text-zinc-100 prose-p:text-zinc-300">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
