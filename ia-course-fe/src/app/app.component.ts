import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ChatService } from './services/chat.service';
import { take } from 'rxjs'

export interface Message {
  by: string;
  message: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  messageForm = new FormControl('');
  messages: Message[] = [];
  canSendMessage = true;
  private shouldScrollToBottom = false;

  constructor(private readonly _chatService: ChatService) { }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  sendMessage(): void {
    if (!this.canSendMessage || !this.messageForm.value?.trim().length) {
      return;
    }
    const message = this.messageForm.value || '';
    this.canSendMessage = false;

    this.messages.push({
      by: 'user',
      message
    });
    this.shouldScrollToBottom = true;

    this.messageForm.setValue('');
    this._chatService.sendMessage(message).pipe(take(1)).subscribe(data => {
      if (data.response) {
        this.handleResponse(data.response);
      }
    })
  }

  private handleResponse(response: string): void {
    this.messages.push({
      by: 'bot',
      message: response
    });
    this.shouldScrollToBottom = true;
    this.canSendMessage = true;
  }

  private scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
}
