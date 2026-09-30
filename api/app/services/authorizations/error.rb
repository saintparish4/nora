module Authorizations
  # Raised when a workflow rule refuses an action. The message is written for
  # the person who asked, and controllers return it as-is with a 422.
  class Error < StandardError; end
end
