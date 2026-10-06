ALTER TABLE notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'curriculum-assigned',
    'curriculum-due',
    'curriculum-overdue',
    'challenge-assigned',
    'challenge-due',
    'challenge-overdue',
    'challenge-revision',
    'challenge-approved',
    'challenge-review-pending',
    'trainer-curriculum-overdue',
    'trainer-challenge-overdue',
    'activity-digest'
  ));
