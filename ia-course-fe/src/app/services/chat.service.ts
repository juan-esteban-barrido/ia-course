import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<any> {
    return this.http.post('http://localhost:3000/chatbot/message', {
      message
    });
  }
}
