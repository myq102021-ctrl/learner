export type ReviewRating = "again" | "hard" | "good" | "easy";
export type LearningStatus = "new" | "learning" | "reviewing" | "mastered";

export interface MemoryStateSnapshot { status: LearningStatus; reviewCount: number; lapseCount: number; currentIntervalDays: number; }
export interface ScheduleResult { status: LearningStatus; intervalDays: number; nextReviewAt: Date; lapse: boolean; }
export interface ReviewScheduler { schedule(state:MemoryStateSnapshot,rating:ReviewRating,now:Date):ScheduleResult; }

const progression = [1,2,4,7,15,30,60,120];
export class EbbinghausScheduler implements ReviewScheduler {
  schedule(state:MemoryStateSnapshot,rating:ReviewRating,now:Date):ScheduleResult {
    const current=Math.max(0,state.currentIntervalDays); let interval=1; let status:LearningStatus="learning"; let lapse=false;
    if(rating==="again"){interval=0;lapse=true;status="learning";}
    if(rating==="hard"){interval=Math.max(1,Math.round(current*1.2));status="reviewing";}
    if(rating==="good"){interval=progression.find(v=>v>current)??Math.round(current*1.8);status=interval>=30?"mastered":"reviewing";}
    if(rating==="easy"){interval=Math.max(4,Math.round((current||2)*2.5));status=interval>=30?"mastered":"reviewing";}
    const nextReviewAt=new Date(now); interval===0?nextReviewAt.setMinutes(nextReviewAt.getMinutes()+10):nextReviewAt.setDate(nextReviewAt.getDate()+interval);
    return {status,intervalDays:interval,nextReviewAt,lapse};
  }
}
