import {Sequence} from "remotion";
import {Scene001} from "./Scene001";
export const videoDurationInFrames = 62 * 30;
export const SceneTimeline=()=> <Sequence durationInFrames={videoDurationInFrames}><Scene001/></Sequence>;
