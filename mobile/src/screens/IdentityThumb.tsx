import type { CardDb } from "../engine";
import { CardImage } from "../game/CardImage";

export function IdentityThumb({ title, db }: { title: string; db: CardDb }) {
  const card = db.byTitle.get(title);
  return <span class="deck-id">{card?.code && <CardImage code={card.code} alt={title} size="small" width="30px" lazy />}</span>;
}
