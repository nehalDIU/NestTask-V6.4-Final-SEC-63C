import { useState, useEffect, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../types/task';

interface TaskSummary {
  total: number;
  completed: number;
  overdue: number;
  inProgress: number;
}

interface MonthlyCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  tasks: Task[];
}

export function MonthlyCalendar({ isOpen, onClose, selectedDate, onSelectDate, tasks }: MonthlyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [longPressedDate, setLongPressedDate] = useState<Date | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout>();
  const longPressTimeoutRef = useRef<NodeJS.Timeout>();
  const calendarRef = useRef<HTMLDivElement>(null);
  const isMobileRef = useRef(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      isMobileRef.current = window.innerWidth <= 768;
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get all days in the current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Get tasks summary for a specific date
  const getTaskSummary = (date: Date): TaskSummary => {
    const dayTasks = tasks.filter(task => isSameDay(parseISO(task.dueDate), date));
    return {
      total: dayTasks.length,
      completed: dayTasks.filter(task => task.status === 'completed').length,
      overdue: dayTasks.filter(task => 
        task.status !== 'completed' && new Date(task.dueDate) < new Date()
      ).length,
      inProgress: dayTasks.filter(task => 
        task.status !== 'completed' && new Date(task.dueDate) >= new Date()
      ).length
    };
  };

  // Handle mouse enter with delay for tooltip
  const handleMouseEnter = (date: Date) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setHoveredDate(date);
    }, 500); // Show tooltip after 500ms hover
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setHoveredDate(null);
  };

  // Handle touch start for long press
  const handleTouchStart = (date: Date) => {
    if (!isMobileRef.current) return;
    
    longPressTimeoutRef.current = setTimeout(() => {
      setLongPressedDate(date);
    }, 500); // 500ms for long press
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    setLongPressedDate(null);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/20 backdrop-blur-sm"
        >
          <div className="monthly-calendar w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl"
               ref={calendarRef}>
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>

              <button
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {daysInMonth.map((date, index) => {
                  const summary = getTaskSummary(date);
                  const hasOverdueTasks = summary.overdue > 0;

                  return (
                    <motion.button
                      key={date.toISOString()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onSelectDate(date);
                        onClose();
                      }}
                      onTouchStart={() => handleTouchStart(date)}
                      onTouchEnd={handleTouchEnd}
                      onMouseEnter={() => handleMouseEnter(date)}
                      onMouseLeave={handleMouseLeave}
                      className={`
                        relative aspect-square rounded-lg
                        flex flex-col items-center justify-center gap-1
                        transition-all duration-200 ease-in-out
                        ${isSameDay(date, selectedDate)
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                          : isToday(date)
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      {/* Date Number */}
                      <span className={`
                        text-sm font-medium 
                        ${isSameDay(date, selectedDate)
                          ? 'text-white'
                          : isToday(date)
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300'
                        }
                      `}>
                        {format(date, 'd')}
                      </span>
                      
                      {/* Task Status Indicators */}
                      {summary.total > 0 && (
                        <div className={`
                          flex items-center justify-center
                          min-h-[6px] min-w-[6px]
                          gap-[3px]
                        `}>
                          {summary.completed > 0 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-1.5 h-1.5 rounded-full bg-green-500/80 dark:bg-green-400/80 shadow-sm"
                            />
                          )}
                          {summary.overdue > 0 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-1.5 h-1.5 rounded-full bg-red-500/80 dark:bg-red-400/80 shadow-sm animate-pulse"
                            />
                          )}
                          {summary.inProgress > 0 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-1.5 h-1.5 rounded-full bg-blue-500/80 dark:bg-blue-400/80 shadow-sm"
                            />
                          )}
                        </div>
                      )}

                      {/* Tooltip - Show on hover for desktop or long press for mobile */}
                      <AnimatePresence>
                        {((hoveredDate && isSameDay(date, hoveredDate)) || 
                          (longPressedDate && isSameDay(date, longPressedDate))) && 
                          summary.total > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full mb-2 z-50 w-48 p-2
                              bg-white dark:bg-gray-800 rounded-lg shadow-lg
                              border border-gray-100 dark:border-gray-700
                              text-left touch-none"
                          >
                            <div className="space-y-1 text-xs">
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {format(date, 'MMMM d, yyyy')}
                              </div>
                              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                Completed: {summary.completed}
                              </div>
                              {summary.overdue > 0 && (
                                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                  Overdue: {summary.overdue}
                                </div>
                              )}
                              {summary.inProgress > 0 && (
                                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                  In Progress: {summary.inProgress}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Selected/Today Indicator Ring */}
                      {(isSameDay(date, selectedDate) || isToday(date)) && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`
                            absolute inset-0 rounded-lg
                            ${isSameDay(date, selectedDate)
                              ? 'ring-2 ring-blue-400/50 dark:ring-blue-500/50'
                              : 'ring-1 ring-blue-400/30 dark:ring-blue-500/30'
                            }
                          `}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
