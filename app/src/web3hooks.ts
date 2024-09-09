// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";

type Network = "mainnet" | "testnet" | "devnet" | "localnet";

const pkg = import.meta.env.VITE_PACKAGE_ID as string;

export const useMarket = () => {
  const client = new SuiClient({
    url: getFullnodeUrl(import.meta.env.VITE_ACTIVE_NETWORK as Network),
  });

  const getOwnedNFTs = async (address: string) => {
    const response = await client.getOwnedObjects({
      owner: address,
      options: {
        showContent: true,
        showType: true,
      },
      filter: {
        StructType: `${pkg}::private_nft::EncryptedNFT`,
      }
    });

    const nfts = response.data.map((item: any) => {
      const ret = item.data?.content.fields;
      ret.id = ret.id.id;
      ret.ephemeral = ret.encrypted_master_key.fields.ephemeral.fields.bytes;
      ret.ciphertext = ret.encrypted_master_key.fields.ciphertext.fields.bytes;
      return ret;
    });

    // nfts.forEach((nft: any) => {
    //   const ephemeral = nft.encryptedMasterKey.fields.ephemeral.fields.bytes;
    //   const ciphertext = nft.encryptedMasterKey.fields.ciphertext.fields.bytes;
    //   nft.ephemeral = ephemeral;
    //   nft.ciphertext = ciphertext;
    // });
    return nfts;
  };

  const createNFT = (
    name: string,
    image_url: string,
    cipher_url: string,
    ephemeral: string,
    ciphertext: string,
    user: string
  ) => {
    const tx = new TransactionBlock();
    
    const nft = tx.moveCall({
      target: `${pkg}::private_nft::new`,
      arguments: [
        tx.pure.string(name),
        tx.pure.string(image_url),
        tx.pure.string(cipher_url),
        tx.pure(Array.from(Buffer.from(ephemeral, 'hex'))),
        tx.pure(Array.from(Buffer.from(ciphertext, 'hex'))),
        tx.object("0x4116e7ce7afcb735df04caf506069c11d98add78a24b3a59561c40e73c751983"),
      ],
    });

    tx.transferObjects([nft], tx.pure.address(user));

    return tx;
  };

  const transferNFT = (
    nft: string,
    to: string,
    senderPublicKey: number[],
    receiverPublicKey: number[],
    prevEphemeral: number[],
    prevCiphertext: number[],
    newEphemeral: number[],
    newCiphertext: number[],
    proof_s1: number[],
    proof_s2: number[],
    proof_u1: number[],
    proof_u2: number[],
    proof_v: number[]
  ) => {
    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${pkg}::private_nft::transfer_to`,
      arguments: [
        tx.object(nft),
        tx.pure.address(to),
        tx.pure(senderPublicKey, "vector<u8>"),
        tx.pure(receiverPublicKey, "vector<u8>"),
        tx.pure(prevEphemeral, "vector<u8>"),
        tx.pure(prevCiphertext, "vector<u8>"),
        tx.pure(newEphemeral, "vector<u8>"),
        tx.pure(newCiphertext, "vector<u8>"),
        tx.pure(proof_s1, "vector<u8>"),
        tx.pure(proof_s2, "vector<u8>"),
        tx.pure(proof_u1, "vector<u8>"),
        tx.pure(proof_u2, "vector<u8>"),
        tx.pure(proof_v, "vector<u8>"),
      ],
    });

    return tx;
  }

  // const getAllNFTs = async (id: string) => {
  //   const response: any= await client.getObject({
  //     id,
  //     options:{
  //       "showType": true,
  //       "showOwner": true,
  //       "showPreviousTransaction": true,
  //       "showDisplay": false,
  //       "showContent": true,
  //       "showBcs": false,
  //       "showStorageRebate": true
  //     }
  //   });
    
  //   let nfts_list: any = response.data.content.fields.nft_ids.fields.contents
  //   console.log({nfts_list});

  //   const nfts = nfts_list.map(async (item: any) => {
  //     const ret: any = await client.getObject({
  //       id: item,
  //       options:{
  //         "showType": true,
  //         "showOwner": true,
  //         "showPreviousTransaction": true,
  //         "showDisplay": false,
  //         "showContent": true,
  //         "showBcs": false,
  //         "showStorageRebate": true
  //       }
  //     }); 
      
  //     const res = ret.data?.content.fields;
  //     res.id = ret.data?.content.fields.id;
  //     res.ephemeral = res.encrypted_master_key.fields.ephemeral.fields.bytes;
  //     res.ciphertext = res.encrypted_master_key.fields.ciphertext.fields.bytes;
  //     return res;
  //   });
  //   console.log({NFT: nfts});
    
  //   return nfts
  // };

  // Define the type of NFT response data
interface NFTResponse {
  id: string;
  name: string;
  image_url: string;
  ciphertext_url: string;
  ephemeral: string;
  ciphertext: string;
  public_key: string;
}

// Define the type of the response from `client.getObject`
interface GetObjectResponse {
  data: {
    content: {
      fields: {
        nft_ids: {
          fields: {
            contents: string[];
          }
        };
      }
    };
  };
}

const getAllNFTs = async (id: string): Promise<NFTResponse[]> => {
  try {
    const response: GetObjectResponse = await client.getObject({
      id,
      options: {
        showType: true,
        showOwner: true,
        showPreviousTransaction: true,
        showDisplay: false,
        showContent: true,
        showBcs: false,
        showStorageRebate: true
      }
    });

    const nftsList: string[] = response.data.content.fields.nft_ids.fields.contents;

    // Fetch details for each NFT and use `Promise.all` to handle multiple promises
    const nfts: NFTResponse[] = await Promise.all(
      nftsList.map(async (item: string) => {
        const ret: any = await client.getObject({
          id: item,
          options: {
            showType: true,
            showOwner: true,
            showPreviousTransaction: true,
            showDisplay: false,
            showContent: true,
            showBcs: false,
            showStorageRebate: true
          }
        });

        const fields = ret.data?.content?.fields;

        return {
          id: fields?.id || '',
          name: fields?.name || '',
          image_url: fields?.image_url || '',
          ciphertext_url: fields?.ciphertext_url || '',
          ephemeral: fields?.encrypted_master_key?.fields?.ephemeral?.fields?.bytes || '',
          ciphertext: fields?.encrypted_master_key?.fields?.ciphertext?.fields?.bytes || '',
          public_key: fields?.public_key || '',
        };
      })
    );

    console.log({ NFT: nfts });

    return nfts;
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return [];
  }
};

  return {getOwnedNFTs, createNFT, transferNFT, getAllNFTs};
};
