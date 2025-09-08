import { CardSummaryDTO } from './card.model';

export interface DeckView {
  id: number;
  ownerId: string;
  name: string;
  cards: CardSummaryDTO[];
  totalCards: number;
  notes?: string;
}
