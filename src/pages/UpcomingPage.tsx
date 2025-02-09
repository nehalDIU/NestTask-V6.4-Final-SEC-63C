import { useState, useMemo, useEffect } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO, isAfter, isBefore, startOfDay, endOfDay, formatDistanceToNow } from 'date-fns';
import { Crown, Calendar, Clock, Tag, CheckCircle2, AlertCircle, BookOpen, FileText, PenTool, FlaskConical, GraduationCap, CalendarDays } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../hooks/useAuth';
import { TaskDetailsPopup } from '../components/task/TaskDetailsPopup';
import { MonthlyCalendar } from '../components/MonthlyCalendar';
import type { Task } from '../types/task';

interface UpcomingPageProps {
  tasks: Task[];
}

export function UpcomingPage() {
  const { user } = useAuth();
  const { tasks: allTasks, loading, error: taskError, updateTask } = useTasks(user?.id);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isMonthlyCalendarOpen, setIsMonthlyCalendarOpen] = useState(false);

  // Update local tasks when allTasks changes
  useEffect(() => {
    setTasks(allTasks || []);
  }, [allTasks]);

  // Generate week days with current date in middle
  const weekDays = useMemo(() => {
    const start = addDays(selectedDate, -3); // Start 3 days before selected date
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return {
        date,
        day: format(date, 'dd'),
        weekDay: format(date, 'EEE'),
        isSelected: isSameDay(date, selectedDate),
        isToday: isSameDay(date, new Date())
      };
    });
  }, [selectedDate]);

  // Filter tasks for selected date
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const taskDate = parseISO(task.dueDate);
      return isSameDay(taskDate, selectedDate);
    });
  }, [tasks, selectedDate]);

  // Get task status
  const getTaskStatus = (task: Task) => {
    const dueDate = parseISO(task.dueDate);
    const currentDate = new Date();
    // Compare dates without time to determine if task is overdue
    const isOverdue = isBefore(endOfDay(dueDate), startOfDay(currentDate));

    if (task.status === 'completed') {
      return {
        label: 'Completed',
        color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 ring-green-500/20',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />
      };
    }
    
    if (isOverdue) {
      return {
        label: 'Overdue',
        color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 ring-red-500/20',
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        cardStyle: 'border-l-[3px] border-l-red-500 bg-red-50/30 dark:bg-red-900/10'
      };
    }

    return {
      label: 'In Progress',
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 ring-blue-500/20',
      icon: <Clock className="w-3.5 h-3.5" />
    };
  };

  // Get category info with icon and color
  const getCategoryInfo = (category: string) => {
    const categories = {
      quiz: {
        icon: <BookOpen className="w-3 h-3 md:w-3.5 md:h-3.5" />,
        color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
      },
      assignment: {
        icon: <FileText className="w-3 h-3 md:w-3.5 md:h-3.5" />,
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
      },
      presentation: {
        icon: <PenTool className="w-3 h-3 md:w-3.5 md:h-3.5" />,
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
      },
      'lab-report': {
        icon: <FlaskConical className="w-3 h-3 md:w-3.5 md:h-3.5" />,
        color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
      },
      'lab-final': {
        icon: <GraduationCap className="w-3 h-3 md:w-3.5 md:h-3.5" />,
        color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
      },
      default: {
        icon: <Tag className="w-3 h-3 md:w-3.5 md:h-3.5" />,
        color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300'
      }
    };
    return categories[category as keyof typeof categories] || categories.default;
  };

  // Handle task status update
  const handleStatusUpdate = async (taskId: string, newStatus: Task['status']) => {
    try {
      setIsUpdating(true);
      setOperationError(null);

      // Find the task being updated
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) {
        throw new Error('Task not found in current list');
      }

      // Store the original status
      const originalStatus = taskToUpdate.status;

      try {
        // Update the task
        const updatedTask = await updateTask(taskId, { status: newStatus });
        
        // Update local state
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? updatedTask : task
          )
        );

        // Update selected task if it's the one being updated
        if (selectedTask?.id === taskId) {
          setSelectedTask(updatedTask);
        }
      } catch (error) {
        // Revert to original status on error
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, status: originalStatus } : task
          )
        );
        throw error;
      }
    } catch (error: any) {
      setOperationError('Failed to update task status. Please try again.');
      console.error('Error updating task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Error Alert */}
      {(taskError || operationError) && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg shadow-lg animate-fade-in">
          <p className="text-sm font-medium">{taskError || operationError}</p>
        </div>
      )}

      {/* Loading Overlay */}
      {isUpdating && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-xl animate-scale-in">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              Updating task...
            </p>
          </div>
        </div>
      )}

      {/* Calendar Strip */}
      <div className="max-w-full md:max-w-5xl mx-auto px-2 md:px-6 mb-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => setSelectedDate(new Date())}
            className="flex items-center gap-1.5 px-3 py-1 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse"></div>
            Today
          </button>

          <span 
            className="text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            onClick={() => setIsMonthlyCalendarOpen(true)}
          >
            {format(selectedDate, 'MMMM yyyy')}
          </span>

          <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-lg p-1">
            <button
              onClick={() => {
                const newDate = addDays(selectedDate, -7);
                setSelectedDate(newDate);
              }}
              className="p-1.5 rounded-md text-gray-600 hover:text-blue-600 hover:bg-white dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-700 transition-all duration-200"
              aria-label="Previous week"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={() => {
                const newDate = addDays(selectedDate, 7);
                setSelectedDate(newDate);
              }}
              className="p-1.5 rounded-md text-gray-600 hover:text-blue-600 hover:bg-white dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-700 transition-all duration-200"
              aria-label="Next week"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Date Boxes */}
        <div className="grid grid-cols-7 gap-2 md:gap-6 md:px-8">
          {weekDays.map((day) => (
            <button
              key={day.day}
              onClick={() => setSelectedDate(day.date)}
              className={`
                relative group
                flex flex-col items-center justify-center
                w-full aspect-square md:aspect-[5/6]
                p-1.5 md:p-6 rounded-xl md:rounded-3xl
                border-2 transition-all duration-300
                ${day.isSelected
                  ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 border-blue-400/50 shadow-lg shadow-blue-500/20 dark:shadow-blue-600/20 scale-[1.02] -translate-y-1 md:scale-110'
                  : day.isToday
                  ? 'bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-50 border-blue-200/70 dark:from-blue-900/50 dark:via-indigo-900/40 dark:to-purple-900/50 dark:border-blue-700/50 md:from-blue-200/90 md:to-blue-100/90 dark:md:from-blue-800/90 dark:md:to-blue-900/90'
                  : 'bg-gradient-to-br from-white/90 via-gray-50/80 to-gray-100/90 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-900/90 border-gray-200/50 dark:border-gray-700/50 md:from-white/95 md:to-gray-50/95 dark:md:from-gray-800/95 dark:md:to-gray-900/95'
                }
                hover:shadow-lg hover:-translate-y-0.5
                hover:border-blue-300/70 dark:hover:border-blue-600/70
                group-hover:shadow-blue-500/10 dark:group-hover:shadow-blue-600/10
                active:scale-95 touch-manipulation
                md:hover:shadow-2xl md:hover:-translate-y-2 md:hover:scale-105
                md:shadow-md md:dark:shadow-gray-950/20
                after:absolute after:inset-0 after:rounded-xl after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] dark:after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]
                md:after:rounded-3xl md:after:shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)] dark:md:after:shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]
              `}
            >
              {/* Weekday */}
              <span className={`
                text-xs md:text-base lg:text-lg font-semibold tracking-wide
                transition-colors duration-200
                ${day.isSelected
                  ? 'text-blue-100'
                  : day.isToday
                  ? 'text-blue-600/90 dark:text-blue-400'
                  : 'text-gray-500 group-hover:text-blue-500 dark:text-gray-400 dark:group-hover:text-blue-400'
                }
                md:mb-2
              `}>
                {day.weekDay}
              </span>

              {/* Day Number */}
              <span className={`
                text-lg md:text-5xl lg:text-6xl font-bold mt-0.5 md:mt-2
                transition-colors duration-200
                ${day.isSelected
                  ? 'text-white'
                  : day.isToday
                  ? 'text-blue-600/90 dark:text-blue-400'
                  : 'text-gray-700 group-hover:text-blue-600 dark:text-gray-300 dark:group-hover:text-blue-400'
                }
                md:tracking-tight md:-mb-1
              `}>
                {day.day}
              </span>

              {/* Today Indicator */}
              {day.isToday && !day.isSelected && (
                <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2">
                  <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 animate-pulse shadow-lg shadow-blue-500/50"></div>
                </div>
              )}

              {/* Selected Indicator */}
              {day.isSelected && (
                <div className="absolute inset-0 rounded-xl md:rounded-3xl ring-4 ring-blue-400/40 dark:ring-blue-500/40 animate-pulse"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List with Enhanced Cards */}
      <div className="px-4 md:max-w-5xl md:mx-auto space-y-4 pb-8">
        {filteredTasks.map((task) => {
          const status = getTaskStatus(task);
          const categoryInfo = getCategoryInfo(task.category);
          const dueDate = parseISO(task.dueDate);
          const currentDate = new Date();
          // Compare dates without time to determine if task is overdue
          const isOverdue = isBefore(endOfDay(dueDate), startOfDay(currentDate));
          
          return (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className={`
                group bg-white dark:bg-gray-800 rounded-xl
                shadow-sm hover:shadow-lg
                border border-gray-200/80 dark:border-gray-700/80
                hover:border-blue-200 dark:hover:border-blue-700
                relative overflow-hidden cursor-pointer
                transition-all duration-500 ease-in-out
                transform hover:scale-[1.02] hover:-translate-y-1
                ring-1 ring-black/5 dark:ring-white/10
                hover:ring-2 hover:ring-blue-500/20 dark:hover:ring-blue-400/20
                ${task.status === 'completed' 
                  ? 'opacity-75 hover:opacity-90' 
                  : isOverdue && task.status !== 'completed'
                    ? 'border-l-[3px] border-l-red-500 bg-red-50/20 dark:bg-red-900/10 animate-pulse-subtle ring-red-500/20 dark:ring-red-400/20' 
                    : ''
                }
              `}
            >
              <div className="p-4">
                {/* Header Section */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-2 flex-grow min-w-0">
                    <h3 className={`
                      text-base font-bold leading-tight truncate mb-2
                      ${task.status === 'completed'
                        ? 'text-gray-500 dark:text-gray-400 line-through'
                        : isOverdue && task.status !== 'completed'
                          ? 'text-red-800 dark:text-red-200'
                          : 'text-gray-900 dark:text-gray-50'
                      }
                    `}>
                      {task.name}
                    </h3>
                    {task.isAdminTask && (
                      <div className="flex-shrink-0 p-1 bg-amber-50/50 dark:bg-amber-500/10 rounded-lg">
                        <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400 hidden md:block" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status Badge */}
                    <span className={`
                      hidden md:inline-flex items-center gap-1.5
                      px-3 py-1.5
                      text-xs font-bold
                      rounded-full shadow-sm
                      ${task.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : isOverdue && task.status !== 'completed'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                      }
                      ring-1 ring-inset ring-current/20
                      transition-all duration-300
                      ${isOverdue && !task.status ? 'animate-pulse' : ''}
                      group-hover:shadow-md
                    `}>
                      {status.icon}
                      <span>{status.label}</span>
                    </span>
                    
                    {/* Category Badge */}
                    <span className={`
                      inline-flex items-center gap-1.5
                      px-3 py-1.5
                      text-xs font-semibold
                      rounded-full shadow-sm
                      ${categoryInfo.color}
                      ring-1 ring-inset ring-current/20
                      transition-all duration-300
                      group-hover:shadow-md
                    `}>
                      <span className="transition-transform duration-300 group-hover:-translate-x-0.5">
                        {categoryInfo.icon}
                      </span>
                      <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                        {task.category.replace('-', ' ')}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className={`
                  text-sm leading-relaxed line-clamp-2 mb-4
                  ${task.status === 'completed'
                    ? 'text-gray-500 dark:text-gray-400'
                    : isOverdue
                      ? 'text-gray-700 dark:text-gray-200'
                      : 'text-gray-600 dark:text-gray-300'
                  }
                `}>
                  {task.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Calendar className={`
                        w-4 h-4 
                        transition-colors duration-300
                        ${isOverdue && !task.status 
                          ? 'text-red-700 dark:text-red-300' 
                          : 'text-gray-700 dark:text-gray-300'
                        }`} 
                      />
                      <span className={`
                        font-medium
                        transition-colors duration-300
                        ${isOverdue && !task.status 
                          ? 'text-red-800 dark:text-red-200' 
                          : 'text-gray-700 dark:text-gray-300'
                        }`
                      }>
                        Due: {format(dueDate, 'MMM d')}
                        {isOverdue && !task.status && (
                          <span className="ml-1 text-red-600 dark:text-red-400 font-semibold">
                            (Overdue by {formatDistanceToNow(dueDate, { addSuffix: false })})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>Created: {format(parseISO(task.createdAt), 'MMM d')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {(!filteredTasks || filteredTasks.length === 0) && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-900 dark:text-gray-100 font-medium">No tasks for {format(selectedDate, 'MMMM d')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isSameDay(selectedDate, new Date()) 
                ? "You're all caught up for today!" 
                : "Nothing scheduled for this day"}
            </p>
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsPopup
          task={selectedTask}
          tasks={tasks}
          onClose={() => setSelectedTask(null)}
          onStatusUpdate={handleStatusUpdate}
          isUpdating={isUpdating}
        />
      )}

      {/* Monthly Calendar */}
      <MonthlyCalendar
        isOpen={isMonthlyCalendarOpen}
        onClose={() => setIsMonthlyCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        tasks={tasks}
      />
    </div>
  );
}
