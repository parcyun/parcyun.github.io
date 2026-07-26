import type { Resource } from '../data/resources';
import { icon, typeIcon } from '../lib/icons';

const PREVIEW_IMAGE_BY_ID: Record<string, string> = {
  'spell-drill': '/spell-drill/og-cover.png',
};

export function resourcePreviewId(resourceId: string) {
  return `resource-preview-${resourceId.replace(/[^a-z0-9_-]/gi, '-')}`;
}

export default function ResourceHoverPreview({ resource }: { resource: Resource }) {
  const previewId = resourcePreviewId(resource.id);
  const previewImage = PREVIEW_IMAGE_BY_ID[resource.id] || '/images/og-card.png';

  return (
    <aside className="resource-hover-preview" id={previewId} role="tooltip">
      <img className="resource-hover-image" src={previewImage} alt="" loading="lazy" />
      <span className="resource-hover-copy">
        <span className="resource-hover-kind">
          <span className="ico" dangerouslySetInnerHTML={{ __html: icon(typeIcon[resource.type] || 'guide', 14) }} />
          {resource.type} · {resource.subject}
        </span>
        <strong>{resource.title}</strong>
        <span>{resource.desc}</span>
      </span>
    </aside>
  );
}
