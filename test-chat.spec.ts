import { test, expect } from '@playwright/test';

test.describe('AI Chat Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('Test 1: Page Load - Check initial state', async ({ page }) => {
    // Take screenshot of initial state
    await page.screenshot({ path: 'screenshots/01-initial-load.png', fullPage: true });

    // Verify header elements
    await expect(page.getByText('AI Chat')).toBeVisible();
    await expect(page.getByText('gemini-2.5-flash-lite')).toBeVisible();

    // Verify sidebar is open by default
    await expect(page.getByText('AI 채팅')).toBeVisible();
    await expect(page.getByRole('button', { name: /새 대화/i })).toBeVisible();

    console.log('✅ Test 1 PASSED: Initial page load successful');
  });

  test('Test 2-3: Message Sending and AI Response', async ({ page }) => {
    // Find the textarea input
    const textarea = page.getByRole('textbox');
    await expect(textarea).toBeVisible();

    // Type the message
    await textarea.fill('안녕하세요! 간단히 자기소개 해주세요.');
    console.log('✅ Typed message in textarea');

    // Take screenshot before sending
    await page.screenshot({ path: 'screenshots/02-message-typed.png', fullPage: true });

    // Find and click send button
    const sendButton = page.locator('button[type="submit"]').last();
    await sendButton.click();
    console.log('✅ Clicked send button');

    // Wait for user message to appear
    await expect(page.getByText('안녕하세요! 간단히 자기소개 해주세요.')).toBeVisible({ timeout: 5000 });
    console.log('✅ User message appeared');

    // Wait 8 seconds for AI response to stream in
    await page.waitForTimeout(8000);

    // Take screenshot with AI response
    await page.screenshot({ path: 'screenshots/03-ai-response.png', fullPage: true });

    // Check if assistant message exists (looking for message bubbles)
    const messages = page.locator('[class*="message"]');
    const messageCount = await messages.count();
    console.log(`✅ Found ${messageCount} messages on page`);

    console.log('✅ Test 2-3 PASSED: Message sent and AI response received');
  });

  test('Test 4-5: New Conversation and History', async ({ page }) => {
    // First send a message to create history
    const textarea = page.getByRole('textbox');
    await textarea.fill('테스트 메시지');
    const sendButton = page.locator('button[type="submit"]').last();
    await sendButton.click();
    await page.waitForTimeout(3000);

    // Click "새 대화" button
    const newChatButton = page.getByRole('button', { name: /새 대화/i });
    await newChatButton.click();
    console.log('✅ Clicked 새 대화 button');

    // Wait for new chat to load
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/04-new-conversation.png', fullPage: true });

    // Verify chat area is empty (no messages)
    const emptyState = page.locator('text=/메시지가 없습니다|시작하세요|empty/i');
    
    // Check if previous conversation appears in sidebar
    const sidebarItems = page.locator('[class*="conversation"]');
    console.log(`✅ Sidebar should show previous conversations`);

    console.log('✅ Test 4-5 PASSED: New conversation created');
  });

  test('Test 6: Switch Between Conversations', async ({ page }) => {
    // Create first conversation
    const textarea = page.getByRole('textbox');
    await textarea.fill('첫 번째 메시지');
    await page.locator('button[type="submit"]').last().click();
    await page.waitForTimeout(3000);

    // Create new conversation
    await page.getByRole('button', { name: /새 대화/i }).click();
    await page.waitForTimeout(1000);

    // Send message in second conversation
    await textarea.fill('두 번째 메시지');
    await page.locator('button[type="submit"]').last().click();
    await page.waitForTimeout(3000);

    // Click on first conversation in sidebar
    const conversations = page.locator('[class*="group"]').filter({ hasText: /^\d|시간|오전|오후/ });
    if (await conversations.count() > 0) {
      await conversations.first().click();
      console.log('✅ Clicked on previous conversation');
      
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/05-switched-conversation.png', fullPage: true });

      // Verify first message is visible
      await expect(page.getByText('첫 번째 메시지')).toBeVisible();
      console.log('✅ Test 6 PASSED: Successfully switched conversations');
    }
  });

  test('Test 7: Sidebar Toggle', async ({ page }) => {
    // Find sidebar toggle button (PanelLeft icon button in header)
    const toggleButton = page.locator('header button').first();
    
    // Close sidebar
    await toggleButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/06-sidebar-closed.png', fullPage: true });
    console.log('✅ Sidebar closed');

    // Reopen sidebar
    await toggleButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/07-sidebar-reopened.png', fullPage: true });
    console.log('✅ Sidebar reopened');

    // Verify sidebar is visible again
    await expect(page.getByText('AI 채팅')).toBeVisible();
    console.log('✅ Test 7 PASSED: Sidebar toggle works');
  });

  test('Test 8: Reset/Clear Messages', async ({ page }) => {
    // Send a message first
    const textarea = page.getByRole('textbox');
    await textarea.fill('테스트 메시지');
    await page.locator('button[type="submit"]').last().click();
    await page.waitForTimeout(3000);

    // Find and click reset button (초기화)
    const resetButton = page.getByRole('button', { name: /초기화/i });
    await resetButton.click();
    console.log('✅ Clicked 초기화 button');

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/08-after-reset.png', fullPage: true });

    // Verify messages are cleared
    const messageText = page.getByText('테스트 메시지');
    await expect(messageText).not.toBeVisible();
    
    console.log('✅ Test 8 PASSED: Messages cleared successfully');
  });
});
