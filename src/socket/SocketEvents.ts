// src/socket/SocketEvents.ts
export const SocketEvents = {
    // Connection
    AGENT_IS_CONNECTED: 'agent-is-connected',
    
    // Login/Logout
    AGENT_IS_IDLE: 'agent-is-idle',
    AGENT_IS_ACW: 'agent-is-acw',
    AGENT_LOGIN_FAILED: 'agent-login-failed',
    AGENT_WAS_LOGGED_OUT: 'agent-was-logged-out',
    
    // Manual Mode
    AGENT_ENTERED_MANUAL: 'agent-entered-manual',
    AGENT_MANUAL_ENTER_FAILED: 'agent-manual-enter-failed',
    
    // Calls
    CALL_WAS_CONNECTED: 'call-was-connected',
    CALL_WAS_FINISHED: 'call-was-finished',
    CALL_WAS_NOT_ANSWERED: 'call-was-not-answered',
    CALL_WAS_FAILED: 'call-was-failed',
    
    // Qualification
    MANUAL_CALL_WAS_ANSWERED: 'manual-call-was-answered',
    CALL_HISTORY_WAS_CREATED: 'call-history-was-created',
    
    // Work Breaks
    AGENT_ENTERED_WORK_BREAK: 'agent-entered-work-break',
    AGENT_LEFT_WORK_BREAK: 'agent-left-work-break',
    
    // Generic Errors
    ERROR: 'error',
    EXCEPTION: 'exception',
};
