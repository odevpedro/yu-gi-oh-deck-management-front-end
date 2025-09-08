import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DeckView } from '../../models/deck.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DeckService {
  private baseUrl = 'http://localhost:8081/decks'; // URL do deck-service

  constructor(private http: HttpClient) {}

  getAllDecks(): Observable<DeckView[]> {
    return this.http.get<DeckView[]>(this.baseUrl);
  }

  getDeckFull(id: number): Observable<DeckView> {
    return this.http.get<DeckView>(`${this.baseUrl}/${id}/full`);
  }

  createDeck(name: string): Observable<DeckView> {
    return this.http.post<DeckView>(this.baseUrl, { name });
  }

  addCardToDeck(deckId: number, cardId: number, quantity: number): Observable<DeckView> {
    return this.http.post<DeckView>(`${this.baseUrl}/${deckId}/cards`, { cardId, quantity });
  }
}
