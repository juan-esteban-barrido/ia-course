import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { ChatService } from './services/chat.service';

class MockChatService {
  sendMessage(message: string) {
    return of({ response: `echo: ${message}` });
  }
}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, ReactiveFormsModule],
      declarations: [AppComponent],
      providers: [{ provide: ChatService, useClass: MockChatService }]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  }));

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should send a user message and receive a bot response', () => {
    component.messageForm.setValue('hello world');

    component.sendMessage();

    expect(component.messages.length).toBe(2);
    expect(component.messages[0].by).toBe('user');
    expect(component.messages[0].message).toBe('hello world');
    expect(component.messages[1].by).toBe('bot');
    expect(component.messages[1].message).toBe('echo: hello world');
    expect(component.canSendMessage).toBeTrue();
    expect(component.messageForm.value).toBe('');
  });

  it('should render messages in the template', () => {
    component.messages = [
      { by: 'user', message: 'hi' },
      { by: 'bot', message: 'hello' }
    ];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const container = compiled.querySelector('.container__chat');
    expect(container).toBeTruthy();
    expect(container?.textContent).toContain('hi');
    expect(container?.textContent).toContain('hello');
  });

  it('ngAfterViewChecked calls scrollToBottom when shouldScrollToBottom is true', () => {
    (component as any).shouldScrollToBottom = true;
    const spy = spyOn<any>(component, 'scrollToBottom');

    component.ngAfterViewChecked();

    expect(spy).toHaveBeenCalled();
    expect((component as any).shouldScrollToBottom).toBeFalse();
  });
});
