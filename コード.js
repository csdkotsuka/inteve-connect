// =============================================================================
// 前田・つばき歯科クリニック Google Apps Script 統合APIプロキシ（完全版）
// =============================================================================

var PROPS              = PropertiesService.getScriptProperties();
var LINE_TOKEN         = PROPS.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
var SUPABASE_URL       = PROPS.getProperty('SUPABASE_URL') || 'https://wmnojgmksqlqalyambda.supabase.co';
var SUPABASE_KEY       = PROPS.getProperty('SUPABASE_KEY') || 'sb_publishable_1kH7vYknlRJiOx1A4K3Gxg_zxhDD-OB';
var FROM_EMAIL         = 'kotsuka@creativesd.net';
var DEFAULT_LINE_BOT_ID = '@776cdsuy';

/**
 * 施設情報（LINE公式ID）をSupabase facilitiesテーブルから動的に取得
 */
function getFacilityLineOfficialId() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return DEFAULT_LINE_BOT_ID;
  try {
    var url = SUPABASE_URL + '/rest/v1/facilities?select=line_official_id&limit=1';
    var res = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      var list = JSON.parse(res.getContentText());
      if (list && list.length > 0 && list[0].line_official_id) {
        return list[0].line_official_id;
      }
    }
  } catch (e) {
    console.error('getFacilityLineOfficialId error: ' + e);
  }
  return DEFAULT_LINE_BOT_ID;
}

// ────────────────────────────────────────────────────────────
// GET リクエスト（ブラウザからのCORS完全対応・全アクション実行可能）
// ────────────────────────────────────────────────────────────
function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = params.action || '';
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    var result = {};

    if (action === 'get_events') {
      result = getCalendarEvents(params);
    } else if (action === 'update_calendar_event') {
      result = updateCalendarEvent(params);
    } else if (action === 'create_calendar_event') {
      result = createCalendarEvent(params);
    } else if (action === 'delete_calendar_event') {
      result = deleteCalendarEvent(params);
    } else if (action === 'send_email') {
      result = sendEmailMessage(params);
    } else if (action === 'send_line') {
      result = sendLineMessage(params);
    } else if (action === 'health') {
      result = { ok: true, time: new Date().toISOString(), lineBot: getFacilityLineOfficialId() };
    } else {
      result = { error: 'unknown action: ' + action };
    }

    output.setContent(JSON.stringify(result));
  } catch (err) {
    output.setContent(JSON.stringify({ ok: false, error: err.message, stack: err.stack }));
  }

  return output;
}

// ────────────────────────────────────────────────────────────
// POST リクエスト（LINE WebhookおよびJSON POST用）
// ────────────────────────────────────────────────────────────
function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (ex) {
        body = e.parameter || {};
      }
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    // LINE Webhookイベント
    if (body.events && Array.isArray(body.events)) {
      handleLineWebhook(body.events);
      output.setContent(JSON.stringify({ ok: true }));
      return output;
    }

    var action = body.action || '';
    var result = {};
    if      (action === 'get_events')              result = getCalendarEvents(body);
    else if (action === 'update_calendar_event')   result = updateCalendarEvent(body);
    else if (action === 'create_calendar_event')   result = createCalendarEvent(body);
    else if (action === 'delete_calendar_event')   result = deleteCalendarEvent(body);
    else if (action === 'send_line')               result = sendLineMessage(body);
    else if (action === 'send_line_broadcast')     result = sendLineBroadcast(body);
    else if (action === 'send_email')              result = sendEmailMessage(body);
    else result = { error: 'unknown action: ' + action };

    output.setContent(JSON.stringify(result));
  } catch (err) {
    output.setContent(JSON.stringify({ ok: false, error: err.message }));
  }

  return output;
}

// ============================================================
// Googleカレンダー CRUD
// ============================================================

function getCalendarEvents(params) {
  var cal = CalendarApp.getCalendarById(params.calendarId);
  if (!cal) return { ok: false, error: 'Calendar not found: ' + params.calendarId };

  var now = new Date();
  var from = params.from ? new Date(params.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  var to   = params.to   ? new Date(params.to)   : new Date(now.getFullYear(), now.getMonth() + 3, 0);

  return {
    ok: true,
    events: cal.getEvents(from, to).map(function(ev) {
      return {
        id:          ev.getId(),
        title:       ev.getTitle(),
        start:       ev.getStartTime().toISOString(),
        end:         ev.getEndTime().toISOString(),
        description: ev.getDescription()
      };
    })
  };
}

function findCalendarEvent(cal, eventId) {
  if (!cal || !eventId) return null;
  var ev = cal.getEventById(eventId);
  if (ev) return ev;
  if (eventId.indexOf('@google.com') !== -1) {
    var cleanId = eventId.replace('@google.com', '');
    ev = cal.getEventById(cleanId);
    if (ev) return ev;
  } else {
    ev = cal.getEventById(eventId + '@google.com');
    if (ev) return ev;
  }
  return null;
}

function createCalendarEvent(body) {
  var cal = CalendarApp.getCalendarById(body.calendarId);
  if (!cal) return { ok: false, error: 'Calendar not found: ' + body.calendarId };

  var title = body.title || ((body.customerName || '患者') + ' 様 - ' + (body.menuName || '予約'));
  var desc  = ['患者: ' + (body.customerName || ''), '電話: ' + (body.phone || ''), 'メニュー: ' + (body.menuName || ''), 'メモ: ' + (body.memo || ''), 'ID: ' + (body.reservationId || '')].join('\n');
  var start = new Date(body.startAt);
  var end   = new Date(body.endAt);

  var event = cal.createEvent(title, start, end, { description: desc });
  return { ok: true, eventId: event.getId() };
}

function updateCalendarEvent(body) {
  var cal = CalendarApp.getCalendarById(body.calendarId);
  if (!cal) return { ok: false, error: 'Calendar not found: ' + body.calendarId };

  var event = findCalendarEvent(cal, body.eventId);
  if (!event) {
    return createCalendarEvent(body);
  }

  if (body.startAt && body.endAt) {
    event.setTime(new Date(body.startAt), new Date(body.endAt));
  }
  if (body.title)       event.setTitle(body.title);
  if (body.description) event.setDescription(body.description);

  return { ok: true, eventId: event.getId() };
}

function deleteCalendarEvent(body) {
  var cal = CalendarApp.getCalendarById(body.calendarId);
  if (!cal) return { ok: false, error: 'Calendar not found' };

  var event = findCalendarEvent(cal, body.eventId);
  if (!event) return { ok: true, note: 'event not found or already deleted' };

  event.deleteEvent();
  return { ok: true };
}

// ============================================================
// LINE & メール送信
// ============================================================

function handleLineWebhook(events) {
  events.forEach(function(ev) {
    var userId = ev.source && ev.source.userId;
    if (!userId) return;

    if (ev.type === 'follow') {
      replyLineMessage(ev.replyToken, [
        { type: 'text', text: '友だち追加ありがとうございます！🦷\nつばき歯科クリニックです。\nご予約確認やリマインドをお届けします。' }
      ]);
    } else if (ev.type === 'message' && ev.message.type === 'text') {
      var text = ev.message.text || '';
      var phoneMatch = text.match(/0\d{9,10}/);
      if (phoneMatch) {
        linkLineUserIdToCustomer(userId, phoneMatch[0]);
        replyLineMessage(ev.replyToken, [
          { type: 'text', text: '電話番号 ' + phoneMatch[0] + ' を登録しました。' }
        ]);
      }
    }
  });
}

function linkLineUserIdToCustomer(lineUserId, phone) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  var url = SUPABASE_URL + '/rest/v1/customers?phone=eq.' + encodeURIComponent(phone);
  UrlFetchApp.fetch(url, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    payload: JSON.stringify({ line_user_id: lineUserId }),
    muteHttpExceptions: true
  });
}

function replyLineMessage(replyToken, messages) {
  if (!LINE_TOKEN || !replyToken) return;
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + LINE_TOKEN },
    payload: JSON.stringify({ replyToken: replyToken, messages: messages }),
    muteHttpExceptions: true
  });
}

function sendLineMessage(body) {
  if (!LINE_TOKEN) return { ok: false, error: 'LINE_CHANNEL_ACCESS_TOKEN未設定' };
  if (!body.to) return { ok: false, error: 'to が必要です' };

  var response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + LINE_TOKEN },
    payload: JSON.stringify({ to: body.to, messages: [{ type: 'text', text: body.text || '' }] }),
    muteHttpExceptions: true
  });
  return { ok: response.getResponseCode() === 200 };
}

function sendLineBroadcast(body) {
  if (!LINE_TOKEN) return { ok: false, error: 'LINE_CHANNEL_ACCESS_TOKEN未設定' };
  var response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + LINE_TOKEN },
    payload: JSON.stringify({ messages: [{ type: 'text', text: body.text || '' }] }),
    muteHttpExceptions: true
  });
  return { ok: response.getResponseCode() === 200 };
}

function sendEmailMessage(body) {
  if (!body.to) return { ok: false, error: 'to が必要です' };
  var html = body.htmlBody || ('<p style="font-family:sans-serif;line-height:1.8;">' + (body.text || '') + '</p>');
  GmailApp.sendEmail(body.to, body.subject || '歯科医院からのご連絡', body.text || '', {
    from: FROM_EMAIL,
    name: body.fromName || '椿歯科クリニック',
    htmlBody: html,
    replyTo: FROM_EMAIL
  });
  return { ok: true };
}