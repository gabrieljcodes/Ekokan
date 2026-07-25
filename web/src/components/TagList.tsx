import { Link } from 'react-router-dom';
import type { Tag } from '../types/models';

interface Props {
  tags: Tag[];
}

export default function TagList({ tags }: Props) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="tag-list">
      {tags.map((tag) => (
        <Link
          key={tag.id}
          to={`/?tag=${tag.slug}`}
          className={`tag-badge tag-badge--${tag.category}`}
        >
          {tag.name}
        </Link>
      ))}
    </div>
  );
}
