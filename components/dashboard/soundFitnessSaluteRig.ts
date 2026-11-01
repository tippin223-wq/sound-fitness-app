import type * as Three from "three";

/** Position the wrist at the brow while keeping a flat, palm-down hand. */
export function createSaluteRig(THREE: typeof Three, root: Three.Object3D, shoulder: Three.Object3D, elbow: Three.Object3D, wrist: Three.Object3D) {
  const wristPoint = new THREE.Vector3(), jointPoint = new THREE.Vector3();
  const target = new THREE.Vector3(.44, 3.14, .12);
  const rootRotation = new THREE.Quaternion(), parentRotation = new THREE.Quaternion();
  const flatHand = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, -Math.PI / 2, "ZXY"));
  const localHand = new THREE.Quaternion();
  return (strength: number) => {
    if (strength <= 0) return;
    // Turn the forearm with the palm, instead of asking the wrist alone
    // to absorb a half-turn. That twist was kinking the skinned hand seam.
    elbow.rotation.order = "ZXY";
    elbow.rotation.y += (Math.PI - elbow.rotation.y) * strength;
    // Solve in the athlete's frame so dragging him around never changes the salute.
    for (let pass = 0; pass < 5; pass++) for (const joint of [elbow, shoulder]) {
      root.updateMatrixWorld(true);
      root.worldToLocal(wrist.getWorldPosition(wristPoint));
      root.worldToLocal(joint.getWorldPosition(jointPoint));
      const ax = wristPoint.x - jointPoint.x, ay = wristPoint.y - jointPoint.y;
      const bx = target.x - jointPoint.x, by = target.y - jointPoint.y;
      const correction = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
      joint.rotation.z += correction * .8 * strength;
      joint.rotation.z = THREE.MathUtils.clamp(joint.rotation.z, 0, joint === elbow ? 2.9 : 2.6);
    }
    root.updateMatrixWorld(true);
    root.getWorldQuaternion(rootRotation);
    wrist.parent!.getWorldQuaternion(parentRotation);
    localHand.copy(parentRotation).invert().multiply(rootRotation).multiply(flatHand);
    wrist.quaternion.slerp(localHand, strength);
  };
}
