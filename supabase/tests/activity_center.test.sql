begin;

select plan(8);

select has_table('public', 'activity_receipts', 'Activity receipts table exists');
select has_table('public', 'activity_withdrawals', 'Activity withdrawals table exists');
select has_function(
  'public',
  'get_activity_page',
  array['timestamp with time zone', 'uuid', 'integer'],
  'Activity page RPC exists'
);
select has_function(
  'public',
  'get_activity_unseen_count',
  array[]::text[],
  'Activity unseen count RPC exists'
);
select has_function(
  'public',
  'mark_activity_seen_through',
  array['timestamp with time zone'],
  'Activity seen watermark RPC exists'
);
select has_function(
  'public',
  'mark_activity_read',
  array['uuid[]'],
  'Activity read RPC exists'
);
select function_returns('public', 'activity_supported_notification', array['text'], 'boolean', 'Supported-kind helper returns boolean');
select col_is_pk('public', 'activity_receipts', array['user_id', 'notification_id'], 'Activity receipts are keyed per user and notification');

select * from finish();
rollback;
