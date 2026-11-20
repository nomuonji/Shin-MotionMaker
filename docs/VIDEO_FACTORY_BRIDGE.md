# Video Factory bridge

This private copy adds a freeform Remotion production backend without replacing Animation Factory's Phaser/JSON backend.

## Handoff

1. In nomuonji/animation-factory, run the export-longform tool to convert a longform concept to Shin-MotionMaker's official request JSON.
2. Submit that JSON as factory-requests/<id>.json to this repository on a PR. References to external media remain references; no assets are secretly copied.
3. Use Actions > Video Factory (manual), mode=generate, source=factory-requests/<id>.json. The artifact includes motion-job.zip and handoff.json. It is an editable **starter**, not a completed video.
4. Unzip and have the production agent read AGENTS.md / brief.md / project.json, implement the scenes and run local QA. Commit the authored job under factory-jobs/<id>/ on a PR.
5. Use the same manual action, mode=render, source=factory-jobs/<id>, target=preview or final. Download video.mp4, reports/ and handoff.json.
6. Review content, audio, source rights and intended destination separately. No workflow here pushes to video-publisher or publishes to YouTube.

## Guarantees / constraints

- Production source is tracked at a Git commit; rendered MP4 receives a SHA-256 receipt.
- The render workflow uses the existing CLI, pre/post QC for final explanation videos, structural validation and ghost-frame scanning. Failed checks stop delivery.
- handoff.json deliberately records editorial_review=unreviewed and publishing_authorized=false, even when rendering succeeds.
- No automatic paid image/video generation. The workflow is manual-only, and the Windows runner consumes Actions time.
- SMM job scripts are not sandboxed: only review trusted authored jobs. Symlinks in job source are rejected; rendering uses a temporary copy.
- The original repository is public, but this private copy's Pages workflow must not deploy or verify the upstream public GUI.
