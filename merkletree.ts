import { MerkleTree } from "merkletreejs";
import { keccak256 } from "js-sha3";
import { PublicKey } from "@solana/web3.js";

enum ContributionType {
  BugFixes,
  FeatureDevelopment,
  CodeOptimization,
  BugReporting,
  TestContributions,
}

interface Contribution {
  contributor: PublicKey;
  timestamp: number;
  description: string;
  contributionType: ContributionType;
  points: number;
}

export class ContributionStore {
  private contributions: Contribution[] = [];
  private merkleTree: MerkleTree | null = null;

  constructor() {
    this.merkleTree = null;
  }

  addContribution(contribution: Contribution) {
    this.contributions.push(contribution);
    this.updateMerkleTree();
  }

  private hashContribution(contribution: Contribution): Buffer {
    const encoded = `${contribution.contributor.toBase58()},${contribution.timestamp},${
      contribution.description
    },${contribution.contributionType},${contribution.points}`;
    return Buffer.from(keccak256(encoded), "hex");
  }

  private updateMerkleTree() {
    const leaves = this.contributions.map((c) => this.hashContribution(c));
    this.merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  }

  getRoot(): string {
    if (!this.merkleTree) throw new Error("Merkle tree not initialized");
    return this.merkleTree.getRoot().toString("hex");
  }

  getProof(contribution: Contribution): string[] {
    if (!this.merkleTree) throw new Error("Merkle tree not initialized");
    const leaf = this.hashContribution(contribution);
    return this.merkleTree.getProof(leaf).map((x) => x.data.toString("hex"));
  }

  getContributionsByUser(contributor: PublicKey): Contribution[] {
    return this.contributions.filter((c) => c.contributor.equals(contributor));
  }
}
